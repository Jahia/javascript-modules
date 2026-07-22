import { registerNodeValidator } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for JS-declared node validators on javascriptExample:testValidation.
 *
 * Exercises: field-level violations, node-level violations, message pass-through with special
 * characters, the advanced phase (only runs when the default phase passes), and skipOnImport.
 */

const NODE_TYPE = "javascriptExample:testValidation";

// default phase: email format (field-level), node-level probe, special-characters probe
registerNodeValidator({ nodeType: NODE_TYPE }, (node) => {
  const email = node.getPropertyAsString("email");
  if (!email) return undefined;

  if (email === "node-level-probe") {
    return { message: "This content is inconsistent (node-level probe)" };
  }
  if (email === "escaping-probe") {
    // must survive verbatim: braces, EL-lookalike, backslash
    return { message: "lone { brace, ${7*7}, back\\slash and {jcr:title}", propertyName: "email" };
  }
  if (!email.includes("@")) {
    return { message: "Please provide a valid email address", propertyName: "email" };
  }
  return undefined;
});

// advanced phase: only runs once the default phase passed
// async on purpose: exercises promise settling in the validator bridge
registerNodeValidator(
  { nodeType: NODE_TYPE, name: "score-range", advanced: true },
  async (node) => {
    if (node.hasProperty("score") && node.getProperty("score").getLong() > 100) {
      return { message: "Score must be at most 100 (advanced phase)", propertyName: "score" };
    }
    return undefined;
  },
);

// skipped during content imports
registerNodeValidator(
  { nodeType: NODE_TYPE, name: "skip-on-import", skipOnImport: true },
  (node) => {
    if (node.getPropertyAsString("email") === "import-probe") {
      return {
        message: "Rejected outside of imports (skip-on-import probe)",
        propertyName: "email",
      };
    }
    return undefined;
  },
);
