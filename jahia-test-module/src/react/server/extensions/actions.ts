import { registerNodeLegacyAction } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for JS-declared actions, invoked via <nodeUrl>.<name>.do URLs.
 *
 * Exercises: GET with query parameters and node access, POST (CSRF-whitelisted via
 * settings/configurations/org.jahia.modules.jahiacsrfguard-jsmtest.cfg), authentication
 * requirement, redirects, and method restrictions.
 */

registerNodeLegacyAction(
  { name: "testJsActionGet", requiredMethods: ["GET"], requireAuthenticatedUser: false },
  // async on purpose: exercises promise settling in the legacy action bridge
  async ({ parameters, resource }) => ({
    json: {
      echo: parameters.echo?.[0] ?? null,
      path: resource.getNode().getPath(),
    },
  }),
);

registerNodeLegacyAction(
  { name: "testJsActionPost", requiredMethods: ["POST"], requireAuthenticatedUser: false },
  ({ parameters }) => ({
    statusCode: 201,
    json: { received: parameters.payload?.[0] ?? null },
  }),
);

// requireAuthenticatedUser defaults to true: guests get a 401
registerNodeLegacyAction(
  { name: "testJsActionAuth", requiredMethods: ["GET"] },
  ({ renderContext }) => ({
    json: { user: renderContext.getUser().getUsername() },
  }),
);

registerNodeLegacyAction(
  { name: "testJsActionRedirect", requiredMethods: ["GET"], requireAuthenticatedUser: false },
  // No statusCode: the platform picks the redirect status itself (303 unless the request asks for
  // another one). Returning a 3xx here would make Jahia answer sendError() instead of redirecting.
  () => ({ redirect: "/redirected-target" }),
);
