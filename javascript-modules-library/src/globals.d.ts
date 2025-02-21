/** The global declarations, where top-level objects are exposed to server-side scripts */
declare global {
  import type { Bundle } from "org.osgi.framework";

  /**
   * Exposed only during the server-side initial script registration process, not available during
   * rendering
   */
  export const bundle: Bundle;
}

/**
 * This module is used for internal compilation of the project. It should not be used directly in
 * your code.
 */
declare module "virtual:jahia-server" {
  import type {
    ConfigHelper,
    GQLHelper,
    OSGiHelper,
    RegistryHelper,
    RenderHelper,
  } from "org.jahia.modules.javascript.modules.engine.js.server";
  /**
   * A set of helpers that provide common functionality provided by Jahia for Javascript server-side
   * rendering
   */
  const server: {
    /** This helper provides access to OSGi configuration */
    config: ConfigHelper;
    /** This helper provides access Jahia's GraphQL API, to execute queries and mutations */
    gql: GQLHelper;
    /** This helper provides access to OSGi bundle for resource loading and service access */
    osgi: OSGiHelper;
    /**
     * This helper provides access to Jahia's registry API, to register new UI objects or retrieving
     * existing ones
     */
    registry: RegistryHelper;
    /**
     * This helper provides rendering functions such as registering page resources, adding cache
     * dependencies or rendering components
     */
    render: RenderHelper;
  };
  export default server;
}
