import { registerAction } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for JS-declared actions, invoked via <nodeUrl>.<name>.do URLs.
 *
 * Exercises: GET with query parameters and node access, POST (CSRF-whitelisted via
 * settings/configurations/org.jahia.modules.jahiacsrfguard-jsmtest.cfg), authentication
 * requirement, redirects, and method restrictions.
 */

registerAction(
  { name: "testJsActionGet", requiredMethods: ["GET"], requireAuthenticatedUser: false },
  ({ parameters, resource }) => ({
    json: {
      echo: parameters.echo?.[0] ?? null,
      path: resource.getNode().getPath(),
    },
  }),
);

registerAction(
  { name: "testJsActionPost", requiredMethods: ["POST"], requireAuthenticatedUser: false },
  ({ parameters }) => ({
    statusCode: 201,
    json: { received: parameters.payload?.[0] ?? null },
  }),
);

// requireAuthenticatedUser defaults to true: guests get a 401
registerAction({ name: "testJsActionAuth", requiredMethods: ["GET"] }, ({ renderContext }) => ({
  json: { user: renderContext.getUser().getName() },
}));

registerAction(
  { name: "testJsActionRedirect", requiredMethods: ["GET"], requireAuthenticatedUser: false },
  () => ({
    statusCode: 302,
    redirect: "/redirected-target",
  }),
);
