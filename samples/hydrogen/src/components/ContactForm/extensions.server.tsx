import {
  registerNodeLegacyAction,
  registerChoiceListInitializer,
  registerNodeValidator,
} from "@jahia/javascript-modules-library";

/**
 * Server-side extension points backing the contact form component, all declared in JavaScript:
 * an action receiving the form submissions, a choicelist initializer for the form style, and a
 * node validator on the notification email.
 */

// receives the form POST; the URL pattern is whitelisted in Jahia's CSRF guard by
// settings/configurations/org.jahia.modules.jahiacsrfguard-hydrogen.cfg
registerNodeLegacyAction(
  { name: "hydrogenContact", requiredMethods: ["POST"], requireAuthenticatedUser: false },
  ({ parameters, resource }) => {
    const from = parameters.from?.[0];
    const message = parameters.message?.[0];
    if (!from || !message) {
      return { statusCode: 400, json: { success: false, error: "Missing from or message" } };
    }
    // a real module would store the submission or notify someone here
    console.info(`Contact form submission on ${resource.getNode().getPath()} from ${from}`);
    return { json: { success: true } };
  },
);

// populates the "style" dropdown of the component in Content Editor
registerChoiceListInitializer({ key: "hydrogenFormStyles" }, ({ locale }) => [
  { label: locale.startsWith("fr") ? "Simple" : "Plain", value: "plain", properties: { defaultProperty: true } },
  { label: locale.startsWith("fr") ? "Encadré" : "Boxed", value: "boxed" },
]);

// rejects saves with an invalid notification email, with a field-level error in Content Editor
registerNodeValidator({ nodeType: "hydrogen:contactForm" }, (node) => {
  const email = node.getPropertyAsString("notificationEmail");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Please provide a valid email address", propertyName: "notificationEmail" };
  }
});
