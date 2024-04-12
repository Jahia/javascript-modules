import {ConfigHelper, GQLHelper, OSGiHelper, RegistryHelper, RenderHelper} from 'org.jahia.modules.npm.modules.engine.js.server';

/**
 * A set of helpers that provide common functionality provided by Jahia for Javascript server-side rendering
 */
export const server: {
    /**
     * This helper provides access to OSGi configuration
     */
    config: ConfigHelper,
    /**
     * This helper provides access Jahia's GraphQL API, to execute queries and mutations
     */
    gql: GQLHelper,
    /**
     * This helper provides access to OSGi bundle for resource loading and service access
     */
    osgi: OSGiHelper,
    /**
     * This helper provides access to Jahia's registry API, to register new UI objects or retrieving existing ones
     */
    registry: RegistryHelper,
    /**
     * This helper provides rendering functions such as registering page resources, adding cache dependencies or rendering components
     */
    render: RenderHelper
};
