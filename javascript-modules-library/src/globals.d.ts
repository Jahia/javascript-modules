import type { Bundle } from "org.osgi.framework";
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
   * Exposed only during the server-side initial script registration process, not available during
   * rendering
   */
  declare const bundle: Bundle;

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
