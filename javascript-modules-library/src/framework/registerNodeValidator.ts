import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { Locale } from "java.util";

/**
 * `registerNodeValidator` calls are executed synchronously during module initialization. During
 * this time, `bundleKey` is set to the symbolic name of the active bundle.
 */
declare const bundleKey: string;

/** A violation reported by a node validator. */
export interface NodeValidatorViolation {
  /**
   * The message shown to the editor. Either literal text, or a `{resource.bundle.key}` reference
   * resolved by Jahia against the deployed resource bundles (in the editor's UI locale) — the same
   * i18n mechanism used by Java validators. Any other text is displayed verbatim.
   */
  message: string;
  /**
   * JCR property name (e.g. `"jcr:title"`) to attach the violation to a specific field in the
   * editing UI; omit for a node-level violation.
   */
  propertyName?: string;
}

/** Context passed to a node validator callback. */
export interface NodeValidatorContext {
  /**
   * BCP-47 language tag of the saving session's locale, or null when the save is not bound to a
   * locale. Note that Jahia silently drops violations on internationalized properties when the
   * session locale is null.
   */
  locale: string | null;
  /** Escape hatch: the raw Java objects. */
  java: {
    locale: Locale | null;
  };
}

/** Declaration of a node validator. */
export interface NodeValidatorDeclaration {
  /** Node type (primary or mixin) this validator applies to, matched with `isNodeType()`. */
  nodeType: string;
  /**
   * Distinguishes several validators declared for the same node type in the same module.
   *
   * @default "default"
   */
  name?: string;
  /** Skip this validator during content imports. @default false */
  skipOnImport?: boolean;
  /**
   * Run this validator in the advanced phase, which only runs once all default-phase validators
   * passed. @default false
   */
  advanced?: boolean;
}

/**
 * Registers a server-side node validator, executed by Jahia on every session save of a node of the
 * declared type. Returning one or more violations rejects the save and surfaces the messages in the
 * editing UI (field-level when `propertyName` is set, node-level otherwise).
 *
 * ```ts
 * registerNodeValidator({ nodeType: "mymodule:article" }, (node) => {
 *   const email = node.getPropertyAsString("email");
 *   if (email && !email.includes("@")) {
 *     return { message: "Please provide a valid email address", propertyName: "email" };
 *   }
 * });
 * ```
 *
 * Validators run on every matching save — keep them fast, and never call `session.save()` from a
 * validator. They may be `async` (microtask-only: the server runtime has no timers or async I/O).
 *
 * @param declaration The validator declaration.
 * @param validate Returns the violations (array, single violation, or nothing when valid).
 */
export const registerNodeValidator = (
  { nodeType, name = "default", skipOnImport = false, advanced = false }: NodeValidatorDeclaration,
  validate: (
    node: JCRNodeWrapper,
    context: NodeValidatorContext,
  ) =>
    | NodeValidatorViolation[]
    | NodeValidatorViolation
    | undefined
    | Promise<NodeValidatorViolation[] | NodeValidatorViolation | undefined>,
): void => {
  server.registry.add("node-validator", `${bundleKey}_node-validator_${nodeType}_${name}`, {
    nodeType,
    skipOnImport,
    advanced,
    // Raw adapter invoked by the Java bridge (NodeValidatorRegistrar) with the node and a context
    // holding the raw session locale. Keep both shapes in sync.
    validate: (node: JCRNodeWrapper, javaContext: { locale: Locale | null }) =>
      validate(node, {
        locale: javaContext.locale ? javaContext.locale.toLanguageTag() : null,
        java: { locale: javaContext.locale },
      }),
  });
  console.debug(`Registered node validator for ${nodeType} (${name})`);
};
