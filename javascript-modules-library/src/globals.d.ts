import type {
  ConfigHelper,
  DevHelper,
  GQLHelper,
  JcrHelper,
  OSGiHelper,
  RegistryHelper,
  RenderHelper,
} from "org.jahia.modules.javascript.modules.engine.js.server";

/** The global declarations, where top-level objects are exposed to server-side scripts */
declare global {
  /**
   * A set of helpers that provide common functionality provided by Jahia for Javascript server-side
   * rendering
   */
  declare const server: {
    /** This helper provides access to OSGi configuration */
    config: ConfigHelper;
    /**
     * This helper tells whether a module is currently served by a development server, so that views
     * address its files there instead of in the deployed bundle
     */
    dev: DevHelper;
    /** This helper allows to perform JCR operations */
    jcr: JcrHelper;
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
}
