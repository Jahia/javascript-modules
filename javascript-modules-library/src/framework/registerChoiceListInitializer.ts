import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ExtendedPropertyDefinition } from "org.jahia.services.content.nodetypes";
import type { List, Locale, Map as JavaMap } from "java.util";

/** One selectable entry of a choicelist. */
export interface ChoiceListValue {
  /** Human-readable label shown in the editing UI. */
  label: string;
  /** String persisted in the JCR when this choice is selected. */
  value: string;
  /**
   * Optional metadata attached to the choice, interpreted by the editing UI (e.g. `{ image:
   * "/path.png" }` or `{ defaultProperty: true }`).
   */
  properties?: Record<string, unknown>;
}

/** Context passed to a choicelist initializer callback. */
export interface ChoiceListInitializerContext {
  /** Parameter from the CND declaration `choicelist[myKey='myParam']`; empty string when absent. */
  param: string;
  /**
   * BCP-47 language tag to localize labels for, e.g. `"en"` or `"fr-FR"`. Whether the platform
   * forwards the content language being edited or the editor's UI language varies across Jahia
   * versions — do not build logic on that distinction.
   */
  locale: string;
  /**
   * Choices accumulated by the previous initializers of the CND declaration chain (empty when this
   * initializer is used alone). Return them as part of your result to keep them.
   */
  values: ChoiceListValue[];
  /** The node being edited, when available (not available on creation forms). */
  node?: JCRNodeWrapper;
  /** Escape hatch: the raw Java objects received by the underlying ModuleChoiceListInitializer. */
  java: {
    propertyDefinition: ExtendedPropertyDefinition;
    locale: Locale;
    values: List<unknown>;
    context: JavaMap<string, unknown>;
  };
}

/**
 * Registers a choicelist initializer, usable from CND property definitions to populate dropdowns in
 * the editing UI:
 *
 * ```cnd
 * -color(string, choicelist[myModuleColors]);
 * ```
 *
 * ```ts
 * registerChoiceListInitializer({ key: "myModuleColors" }, ({ locale }) => [
 *   { label: locale === "fr" ? "Rouge" : "Red", value: "red" },
 *   { label: locale === "fr" ? "Vert" : "Green", value: "green" },
 * ]);
 * ```
 *
 * Keys live in a single platform-wide namespace shared with Java modules (last registration wins);
 * prefix them with your module name to avoid collisions.
 *
 * The callback runs on a server thread every time an editor form displays the choicelist — keep it
 * fast. It may be `async`, because Jahia invokes it from a request, with no JavaScript running: a
 * returned promise can then settle (microtask-only, the server runtime has no timers or async
 * I/O).
 *
 * @param options The initializer declaration; `key` is the name referenced from CND definitions.
 * @param resolveValues Returns the choices offered to the editor.
 */
export const registerChoiceListInitializer = (
  { key }: { key: string },
  resolveValues: (
    context: ChoiceListInitializerContext,
  ) => ChoiceListValue[] | Promise<ChoiceListValue[]>,
): void => {
  server.registry.add("choicelist-initializer", key, {
    // Raw adapter invoked by the Java bridge (ChoiceListInitializerRegistrar) with the
    // ModuleChoiceListInitializer#getChoiceListValues arguments. Keep both shapes in sync.
    getChoiceListValues: (
      propertyDefinition: ExtendedPropertyDefinition,
      param: string | null,
      values: List<unknown>,
      locale: Locale,
      context: JavaMap<string, unknown>,
    ): ChoiceListValue[] | Promise<ChoiceListValue[]> =>
      resolveValues({
        param: param ?? "",
        locale: locale ? locale.toLanguageTag() : "",
        values: toJsChoiceListValues(values),
        node: (context?.get("contextNode") as JCRNodeWrapper | null) ?? undefined,
        java: { propertyDefinition, locale, values, context },
      }),
  });
  console.debug(`Registered choicelist initializer: ${key}`);
};

/** Converts the Java List of org.jahia...ChoiceListValue accumulated so far into plain JS objects. */
const toJsChoiceListValues = (values: List<unknown>): ChoiceListValue[] => {
  const result: ChoiceListValue[] = [];
  if (values) {
    for (let i = 0; i < values.size(); i++) {
      // Jahia's ChoiceListValue: getDisplayName(), getValue() (a JCR Value)
      const value = values.get(i) as {
        getDisplayName(): string;
        getValue(): { getString(): string };
      };
      // properties of accumulated values are intentionally not surfaced here;
      // the raw list stays available under the `java` escape hatch
      result.push({ label: value.getDisplayName(), value: value.getValue().getString() });
    }
  }
  return result;
};
