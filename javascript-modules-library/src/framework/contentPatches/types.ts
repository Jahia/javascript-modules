import type {
  JCRNodeWrapper,
  JCRSessionWrapper,
  JCRValueWrapper,
} from "org.jahia.services.content";

/** Declaration of a content patch. */
export interface ContentPatchDeclaration {
  /**
   * Run-once identity AND ordering key of the content patch (content patches of a module are
   * executed in lexicographic order of their names).
   *
   * Recommended shape: `"<moduleVersion>-<NN>-<slug>"`, e.g. `"2.0.0-01-remove-legacy-color"`.
   *
   * NEVER rename or reorder a content patch after it shipped in a release — the name is the key
   * under which its execution is recorded; ship a new content patch instead.
   */
  name: string;
  /** Shown in logs and in the content patch status. */
  description?: string;
}

/**
 * Logger dedicated to one content patch (backed by SLF4J, named
 * `org.jahia.modules.javascript.modules.engine.contentpatches.<module>.<content patch>`).
 */
export interface ContentPatchLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** Values accepted by the property-writing helpers. */
export type ContentPatchPropertyValue = string | number | boolean | JCRNodeWrapper;

/** Common selection options for bulk operations. */
export interface NodeSelection {
  /** Node type whose instances to process. */
  nodeType: string;
  /** Whether instances of subtypes are processed too. @default true */
  includeSubtypes?: boolean;
  /** Limit the selection to a subtree, e.g. `"/sites/acme"`. @default the whole workspace */
  scope?: string;
  /** Optional JCR-SQL2 constraint appended to the generated query, e.g. `"[price] > 1000"`. */
  where?: string;
  /** Workspaces to process. @default ["default", "live"] */
  workspaces?: ("default" | "live")[];
  /** Number of nodes per save/refresh cycle. @default 100 */
  batchSize?: number;
}

/** Raw-query selection, for `jcr.forEachNode`. */
export interface QuerySelection {
  /** Full JCR-SQL2 query selecting the nodes to process. */
  query: string;
  /** Workspaces to process. @default ["default", "live"] */
  workspaces?: ("default" | "live")[];
  /** Number of nodes per save/refresh cycle. @default 100 */
  batchSize?: number;
}

/** Outcome of a bulk operation. */
export interface ContentPatchOperationReport {
  /** Nodes matched by the selection, across all processed workspaces. */
  matched: number;
  /** Nodes actually modified. */
  updated: number;
  /** Nodes matched but left untouched (already up to date, vanished mid-run, …). */
  skipped: number;
  /** Same counters, per workspace. */
  byWorkspace: Record<string, { matched: number; updated: number; skipped: number }>;
}

/**
 * High-level, guard-railed operations. They all iterate `default` and `live`, commit in batches,
 * handle i18n properties on their translation subnodes, no-op gracefully when the node type was
 * never registered on this instance (fresh installs), and honor dry-run mode.
 */
export interface ContentPatchOperations {
  /** Removes leftover values of a property (i18n-aware) on all instances of a node type. */
  removePropertyValues(options: NodeSelection & { property: string }): ContentPatchOperationReport;

  /** Sets a property value on existing content, e.g. to backfill a newly added property. */
  setPropertyValues(
    options: NodeSelection & {
      property: string;
      /**
       * Constant value, or per-node function returning the value to set (return `undefined` to skip
       * the node). For i18n properties the function is called once per locale.
       */
      value:
        | ContentPatchPropertyValue
        | ((node: JCRNodeWrapper, locale?: string) => ContentPatchPropertyValue | undefined);
      /** Never overwrite an existing value. @default true */
      onlyIfMissing?: boolean;
      /** For i18n properties: language codes to process. @default the site languages */
      locales?: string[];
    },
  ): ContentPatchOperationReport;

  /** Rewrites the values of a property after its data type changed in the definitions. */
  convertPropertyValues(
    options: NodeSelection & {
      property: string;
      /**
       * Converts one stored value (which may still carry the previous data type) to the new value.
       * Return `undefined` to leave that value untouched.
       */
      convert: (
        value: JCRValueWrapper,
        node: JCRNodeWrapper,
      ) => ContentPatchPropertyValue | undefined;
    },
  ): ContentPatchOperationReport;

  /**
   * Removes a node type OWNED BY THIS MODULE from the registry, optionally purging its instances.
   * With the default `ifContentExists: "fail"`, the content patch fails (and content is left
   * untouched) if instances still exist — destroying content is opt-in.
   */
  removeNodeType(options: {
    nodeType: string;
    /** @default "fail" */
    ifContentExists?: "fail" | "delete";
    /** @default ["default", "live"] */
    workspaces?: ("default" | "live")[];
    /** @default 100 */
    batchSize?: number;
  }): ContentPatchOperationReport;

  /**
   * Rebinds all instances of the `from` node type to the `to` node type (which must exist in the
   * module's current definitions), optionally renaming properties, then removes the old
   * definition.
   */
  changeNodeType(
    options: Omit<NodeSelection, "nodeType" | "includeSubtypes"> & {
      from: string;
      to: string;
      /** Property renames to apply on each rebound node (i18n-aware), as `{ oldName: newName }`. */
      mapProperties?: Record<string, string>;
      /** Unregister the `from` definition once all instances are rebound. @default true */
      removeOldDefinition?: boolean;
    },
  ): ContentPatchOperationReport;
}

/** Lower-level JCR access for content patches. */
export interface ContentPatchJcr {
  /**
   * Opens a system (root) session on the given workspace and executes the callback with it. With
   * `locale: null` (the default), translation nodes are visible as plain subnodes, which is usually
   * what content patches want.
   *
   * NOTE: unlike the `patch.*` helpers, code in this callback is NOT dry-run aware — check
   * `context.dryRun` yourself before saving if you want to support dry runs.
   */
  withSystemSession<T>(
    options: { workspace?: "default" | "live"; locale?: string | null },
    callback: (session: JCRSessionWrapper) => T,
  ): T;

  /**
   * The batching engine behind the `patch.*` helpers: iterates the selected nodes in batches,
   * committing (`session.save()`) after each batch — or discarding changes in dry-run mode. The
   * callback may return `false` to count the node as skipped instead of updated.
   */
  forEachNode(
    options: NodeSelection | QuerySelection,
    callback: (node: JCRNodeWrapper) => boolean | void,
  ): ContentPatchOperationReport;
}

/** Context passed to a content patch's run function. */
export interface ContentPatchContext {
  /** High-level, guard-railed operations. */
  patch: ContentPatchOperations;
  /** Lower-level JCR access: system sessions and the shared batching iterator. */
  jcr: ContentPatchJcr;
  /** Logger dedicated to this content patch. */
  log: ContentPatchLogger;
  /** True in dry-run mode: helpers report what they would do instead of saving. */
  dryRun: boolean;
  /** Aborts the content patch now and records it as `.skipped` (terminal — it will not run again). */
  skip(reason: string): never;
  /** The module owning this content patch. */
  module: { name: string; version: string };
}

/**
 * Shape of the Java support object handed by the engine's ContentPatchRegistrar to the registered
 * `execute` adapter. Keep in sync with
 * `org.jahia.modules.javascript.modules.engine.registrars.contentpatches.ContentPatchSupport`.
 *
 * @internal
 */
export interface JavaContentPatchSupport {
  getLogger(patchName: string): ContentPatchLogger;
  isDryRun(): boolean;
  getModuleName(): string;
  getModuleVersion(): string;
  getOperations(patchName: string): JavaContentPatchOperations;
}

/**
 * Shape of the per-workspace counters of the Java operation report. Keep in sync with
 * `org.jahia.modules.javascript.modules.engine.contentpatches.OperationReport.WorkspaceReport`.
 *
 * @internal
 */
export interface JavaWorkspaceReport {
  getMatched(): number;
  getUpdated(): number;
  getSkipped(): number;
}

/**
 * Shape of the Java operation report. Keep in sync with
 * `org.jahia.modules.javascript.modules.engine.contentpatches.OperationReport`.
 *
 * @internal
 */
export interface JavaOperationReport extends JavaWorkspaceReport {
  getWorkspaceNames(): { size(): number; get(index: number): unknown };
  getWorkspace(name: string): JavaWorkspaceReport;
}

/**
 * Shape of the shared Java operations engine behind `patch.*` and `jcr.forEachNode` — options
 * objects cross as Java maps, callbacks coerce to the engine's functional interfaces, `null` return
 * values mean "leave untouched". Keep in sync with
 * `org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchOperations`.
 *
 * @internal
 */
export interface JavaContentPatchOperations {
  isNodeTypeRegistered(nodeType: string): boolean;
  forEachNode(
    options: NodeSelection | QuerySelection,
    visitor: (node: JCRNodeWrapper) => boolean | void,
  ): JavaOperationReport;
  removePropertyValues(options: object): JavaOperationReport;
  setPropertyValues(
    options: object,
    value?: (node: JCRNodeWrapper, locale: string | null) => unknown,
  ): JavaOperationReport;
  convertPropertyValues(
    options: object,
    convert: (value: JCRValueWrapper, node: JCRNodeWrapper) => unknown,
  ): JavaOperationReport;
  removeNodeType(options: object): JavaOperationReport;
  changeNodeType(options: object): JavaOperationReport;
}
