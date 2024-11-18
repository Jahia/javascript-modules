import {ConfigHelper, GQLHelper, OSGiHelper, RegistryHelper, RenderHelper} from 'org.jahia.modules.npm.modules.engine.js.server';
import {JCRNodeWrapper} from 'org.jahia.services.content';
import {Resource, RenderContext} from 'org.jahia.services.render';

/**
 * This module is used for internal compilation of the project. It should not be used directly in your code.
 */
declare module '@jahia/js-server-core-private' {
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

    /**
     * A context object that gives access to the underlying Jahia Java objects that are part of the current rendering context
     */
    export interface ServerContext {
        /**
         * Jahia's rendering context, it provides access to all kinds of context information, such as the current request, response, user, mode, mainResource and more
         */
        renderContext : RenderContext;
        /**
         * The current resource being rendered, which is a combination of the current node and its template/view information
         */
        currentResource : Resource;
        /**
         * The current JCR node being rendered
         */
        currentNode : JCRNodeWrapper;
        /**
         * The main JCR node being rendered, which is the root node of the current page
         */
        mainNode : JCRNodeWrapper;
        /**
         * The OSGi bundle key of the current module being rendered
         */
        bundleKey : string;
    }
}
