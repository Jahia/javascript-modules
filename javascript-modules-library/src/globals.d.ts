import type {
  ConfigHelper,
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
    /** This helper allows to perform JCR operations */
    jcr: JcrHelper;
    /** This helper provides access Jahia's GraphQL API, to execute queries and mutations */
    gql: GQLHelper;
    /** This helper provides access to OSGi bundle for resource loading and service access */
    osgi: OSGiHelper;
    /**
     * This helper provides access to Jahia's registry API, to register new UI objects or retrieving
     * existing ones.
     *
     * Do not call `registry.add` directly for server extension points (views, actions, choicelist
     * initializers, node validators, render filters): the entry shapes consumed by the engine are
     * internal contracts that may change between versions. Use the typed registration functions of
     * this library instead (`jahiaComponent`, `registerNodeValidator`,
     * `registerChoiceListInitializer`, `registerRenderFilter`, `registerNodeLegacyAction`, and
     * `.action.ts` files for actions).
     */
    registry: RegistryHelper;
    /**
     * This helper provides rendering functions such as registering page resources, adding cache
     * dependencies or rendering components
     */
    render: RenderHelper;
  };
}
