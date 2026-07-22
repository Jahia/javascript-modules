import type { Node } from "javax.jcr";
import type { Locale } from "java.util";
import type { JCRNodeWrapper, JCRValueWrapper } from "org.jahia.services.content";
import type {
  JavaMigrationSupport,
  MigrationJcr,
  MigrationLogger,
  MigrationOperationReport,
  MigrationOperations,
  MigrationPropertyValue,
} from "./types.js";

const EMPTY_REPORT = (): MigrationOperationReport => ({
  matched: 0,
  updated: 0,
  skipped: 0,
  byWorkspace: {},
});

/** Iterates a Java List through its size()/get() members (safe under GraalVM interop). */
const listToArray = <T>(list: { size(): number; get(index: number): unknown }): T[] => {
  const result: T[] = [];
  for (let i = 0; i < list.size(); i++) {
    result.push(list.get(i) as T);
  }
  return result;
};

/** Builds the `migrate` part of the migration context. */
export const createMigrationOperations = (
  jcr: MigrationJcr,
  support: JavaMigrationSupport,
  log: MigrationLogger,
): MigrationOperations => {
  /** Fresh-install guard: a selection on a type that was never registered here is a graceful no-op. */
  const guarded = (
    nodeType: string,
    operation: () => MigrationOperationReport,
  ): MigrationOperationReport => {
    if (!support.isNodeTypeRegistered(nodeType)) {
      log.info(
        `Node type ${nodeType} is not registered on this instance (fresh install?) — nothing to do`,
      );
      return EMPTY_REPORT();
    }
    return operation();
  };

  /** The locales of the existing translation subnodes of a node. */
  const existingLocales = (node: JCRNodeWrapper): Locale[] =>
    listToArray<Locale>(node.getExistingLocales() as never);

  /** The locales to write i18n values for: explicit option, else the resolved site's languages. */
  const targetLocales = (node: JCRNodeWrapper, locales: string[] | undefined): Locale[] => {
    let siteLocales: Locale[];
    try {
      siteLocales = listToArray<Locale>(node.getResolveSite().getLanguagesAsLocales() as never);
    } catch {
      siteLocales = existingLocales(node);
    }
    return locales ? siteLocales.filter((l) => locales.includes(l.toString())) : siteLocales;
  };

  const removePropertyValues: MigrationOperations["removePropertyValues"] = (options) =>
    guarded(options.nodeType, () =>
      jcr.forEachNode(options, (node) => {
        let touched = false;
        if (node.hasProperty(options.property)) {
          node.getProperty(options.property).remove();
          touched = true;
        }
        for (const locale of existingLocales(node)) {
          const translation = node.getI18N(locale);
          if (translation.hasProperty(options.property)) {
            translation.getProperty(options.property).remove();
            touched = true;
          }
        }
        return touched;
      }),
    );

  const setPropertyValues: MigrationOperations["setPropertyValues"] = (options) => {
    const onlyIfMissing = options.onlyIfMissing ?? true;
    const resolveValue = (
      node: JCRNodeWrapper,
      locale?: string,
    ): MigrationPropertyValue | undefined =>
      typeof options.value === "function" ? options.value(node, locale) : options.value;

    return guarded(options.nodeType, () =>
      jcr.forEachNode(options, (node) => {
        const definition = node.getApplicablePropertyDefinition(options.property);
        if (!definition) {
          return false; // the type has no such property — nothing to set
        }
        if (definition.isMultiple()) {
          log.warn(
            `Property ${options.property} is multi-valued, which setPropertyValues does not support — use jcr.forEachNode`,
          );
          return false;
        }
        let touched = false;
        if (definition.isInternationalized()) {
          for (const locale of targetLocales(node, options.locales)) {
            const translation = node.getOrCreateI18N(locale);
            if (onlyIfMissing && translation.hasProperty(options.property)) continue;
            const value = resolveValue(node, locale.toString());
            if (value === undefined) continue;
            translation.setProperty(options.property, value as never);
            touched = true;
          }
        } else {
          if (onlyIfMissing && node.hasProperty(options.property)) return false;
          const value = resolveValue(node);
          if (value === undefined) return false;
          node.setProperty(options.property, value as never);
          touched = true;
        }
        return touched;
      }),
    );
  };

  const convertPropertyValues: MigrationOperations["convertPropertyValues"] = (options) => {
    /** Converts the property on one node (or translation node); returns whether it was rewritten. */
    const convertOn = (owner: JCRNodeWrapper | Node, node: JCRNodeWrapper): boolean => {
      if (!owner.hasProperty(options.property)) return false;
      const property = owner.getProperty(options.property);
      if (property.isMultiple()) {
        log.warn(
          `Property ${options.property} on ${node.getPath()} is multi-valued, which convertPropertyValues does not support — use jcr.forEachNode`,
        );
        return false;
      }
      const newValue = options.convert(property.getValue() as JCRValueWrapper, node);
      if (newValue === undefined) return false;
      // Remove first: the stored value still carries the previous data type, and JCR refuses to
      // change the type of an existing property in place.
      property.remove();
      owner.setProperty(options.property, newValue as never);
      return true;
    };

    return guarded(options.nodeType, () =>
      jcr.forEachNode(options, (node) => {
        let touched = convertOn(node, node);
        for (const locale of existingLocales(node)) {
          touched = convertOn(node.getI18N(locale), node) || touched;
        }
        return touched;
      }),
    );
  };

  const removeNodeType: MigrationOperations["removeNodeType"] = (options) =>
    guarded(options.nodeType, () => {
      const mode = options.ifContentExists ?? "fail";
      const report = jcr.forEachNode(
        { ...options, includeSubtypes: false },
        (node) => {
          if (mode === "fail") {
            throw new Error(
              `Cannot remove node type ${options.nodeType}: instances still exist (e.g. ${node.getPath()}). ` +
                `Migrate or delete them first, or opt into deletion with ifContentExists: "delete".`,
            );
          }
          node.remove();
        },
      );
      support.unregisterNodeType(options.nodeType);
      log.info(`Node type ${options.nodeType} unregistered`);
      return report;
    });

  const changeNodeType: MigrationOperations["changeNodeType"] = (options) => {
    /** Renames a property on a node or translation node, preserving raw values (incl. multi-valued). */
    const renameOn = (owner: JCRNodeWrapper | Node, oldName: string, newName: string) => {
      if (!owner.hasProperty(oldName)) return;
      const property = owner.getProperty(oldName);
      if (property.isMultiple()) {
        const values = property.getValues();
        property.remove();
        owner.setProperty(newName, values as never);
      } else {
        const value = property.getValue();
        property.remove();
        owner.setProperty(newName, value as never);
      }
    };

    return guarded(options.from, () => {
      if (!support.isNodeTypeRegistered(options.to)) {
        throw new Error(
          `Cannot rebind ${options.from} to ${options.to}: the target type is not registered — ` +
            `is it declared in the module's current definitions?`,
        );
      }
      const report = jcr.forEachNode(
        { ...options, nodeType: options.from, includeSubtypes: false },
        (node) => {
          node.setPrimaryType(options.to);
          for (const [oldName, newName] of Object.entries(options.mapProperties ?? {})) {
            renameOn(node, oldName, newName);
            for (const locale of existingLocales(node)) {
              renameOn(node.getI18N(locale), oldName, newName);
            }
          }
        },
      );
      if (options.removeOldDefinition ?? true) {
        support.unregisterNodeType(options.from);
        log.info(`Node type ${options.from} unregistered`);
      }
      return report;
    });
  };

  return {
    removePropertyValues,
    setPropertyValues,
    convertPropertyValues,
    removeNodeType,
    changeNodeType,
  };
};
