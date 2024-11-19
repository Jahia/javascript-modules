declare module 'org.jahia.modules.npm.modules.engine.js.server' {
import { Bundle } from 'org.osgi.framework';
import { Collection, List, Map } from 'java.util';

import { JCRNodeWrapper, JCRCallback } from 'org.jahia.services.content';
import { Promise } from 'org.jahia.modules.npm.modules.engine.jsengine';

import { JCRSiteNode } from 'org.jahia.services.content.decorator';
import { RenderContext, Resource } from 'org.jahia.services.render';
/**
 * Java helper to expose OSGi configuration values to Javascript code
*/
export class ConfigHelper {
  /**
   * Get the list of OSGi configuration PIDs
   * @return an array of String containing the OSGi configuration PIDs
  */
  getConfigPids(): string[];
  /**
   * Get the list of OSGi configuration factory PIDs for a given factory ID
   * @return an array of String containing the OSGi configuration factory PIDs
  */
  getConfigFactoryIdentifiers(factoryPid: string): string[];
  /**
   * Get the configuration values for a given OSGi configuration PID
   * @param configPid the unique identifier of the OSGi configuration
   * @return a Map<String, Object> containing the configuration values
  */
  getConfigValues(configPid: string): any;
  /**
   * Get the configuration values for a given OSGi configuration factory PID and factory identifier
   * @param factoryPid the factory PID
   * @param factoryIdentifier the factory identifier within the given factory PID
   * @return a Map<String, Object> containing the configuration values
  */
  getConfigFactoryValues(factoryPid: string, factoryIdentifier: string): any;
  /**
   * Get a single configuration value for a given OSGi configuration PID and a property key
   * @param configPid the unique identifier of the OSGi configuration
   * @param key the property key
   * @return a String containing the configuration value
  */
  getConfigValue(configPid: string, key: string): string;
  /**
   * Get a single configuration value for a given OSGi configuration factory PID, factory identifier and a
   * property key
   * @param factoryPid the factory PID
   * @param factoryIdentifier the factory identifier within the given factory PID
   * @param key the property key
   * @return a String containing the configuration value
  */
  getConfigFactoryValue(factoryPid: string, factoryIdentifier: string, key: string): string;
}
/**
 * Helper class to execute GraphQL queries. It provides both synchronous and asynchronous methods to execute queries.
*/
export class GQLHelper {
  /**
   * Execute an asynchronous GraphQL query using the specified parameters and return a Promise that will be resolved with the result
   * @param parameters the parameters can contain the following keys:
   *                   
   *                    query (string) : the GraphQL query to be executed 
   *                    operationName (string) : the GraphQL operation name 
   *                    variables: the variables as a JSON string or a Map<String, Object> 
   *                    renderContext (RenderContext) : the render context
   *                   if the renderContext is null, a request will be created with the parameters that were passed,
   *                   otherwise the request from the renderContext will be used. 
   *                   
   * @return a Promise that will be resolved with the result of the query as a JSON structure or with an error message
   * if there was an error executing the query
  */
  executeQuery(parameters: any): Promise<any>;
  /**
   * Execute a synchronous GraphQL query using the specified parameters and return the result
   * @param parameters the parameters can contain the following keys:
   *                   
   *                    query (string) : the GraphQL query to be executed 
   *                    operationName (string) : the GraphQL operation name 
   *                    variables: the variables as a JSON string or a Map<String, Object> 
   *                    renderContext (RenderContext) : the render context
   *                   if the renderContext is null, a request will be created with the parameters that were passed,
   *                   otherwise the request from the renderContext will be used. 
   *                   
   * @return the result of the query as a JSON structure
   * @throws ServletException
   * @throws IOException
  */
  executeQuerySync(parameters: any): any;
}
/**
 * Helper class to perform JCR operations.
*/
export class JcrHelper {
  /**
   * Execute JCR operations on a JCR session authenticated using the guest user and the "live" workspace.
   * This is intended for server-side use. Example:
   *      *     import {server, useServerContext} from '@jahia/javascript-modules-library';
   *     ...
   *     const {renderContext, currentResource} = useServerContext();
   *     server.jcr.doExecuteAsGuest(session => performJcrOperations(session, renderContext, currentResource));
   * 
   *
   * @param callback the callback to execute using the JCR session
   * @return the result of the callback
  */
  doExecuteAsGuest(callback: JCRCallback<any>): any;
}
/**
 * Helper class to make it possible to access OSGi bundle resources from the JavaScript engine
*/
export class OSGiHelper {
  /**
   * Get the Osgi Bundle by symbolic name
   * @param symbolicName the symbolic name for the bundle
   * @return if successful, the Bundle, otherwise null
  */
  getBundle(symbolicName: string): Bundle;
  /**
   * Load a resource from an OSGi bundle
   * @param bundle the bundle to load the resource from
   * @param path the path to the resource in the bundle
   * @param optional if false an error message will be logged if the resource is not found, otherwise null will be returned
   * @return a String containing the content of the resource if it was found, null otherwise
   * @throws RenderException
  */
  loadResource(bundle: Bundle, path: string, optional: boolean): string;
  /**
   * Load a properties resource from an OSGi bundle
   * @param bundle the bundle to load the resource from
   * @param path the path to the resource in the bundle
   * @return A Map<String,String> containing the properties
   * @throws RenderException
  */
  loadPropertiesResource(bundle: Bundle, path: string): any;
  lookupComponentPaths(bundle: Bundle, extension: string): Collection<string>;
}
/**
 * Helper class to make it possible to access the registry from the JavaScript engine
*/
export class RegistryHelper {
  /**
   * Get an object from the registry by type and key
   * @param type the type of the object to retrieve
   * @param key the key in the type of the object to retrieve
   * @return the object if found as a Map<String,Object>, otherwise null
  */
  get(type: string, key: string): any;
  /**
   * Search objects from the registry by using a map filter. The filter is a map of key-value pairs that will be used
   * to match objects that have the same values for the keys specified in the filter.
   * @param filter a map of key-value pairs to filter the objects to retrieve
   * @return a List of matching objects
  */
  find(filter: any): any[];
  /**
   * Search objects from the registry by using a map filter and an order by clause. The filter is a map of key-value
   * pairs that will be used to match objects that have the same values for the keys specified in the filter.
   * @param filter a map of key-value pairs to filter the objects to retrieve
   * @param orderBy a string representing the key to use to order the resulting objects. Not that this only works if
   *                the key refers to an integer value
   * @return a sorted List of matching objects
  */
  find(filter: any, orderBy: string): any[];
  /**
   * Add a new object in the registry. The object is a map of key-value pairs that will be stored using the specified
   * type and key. Note that if the object already exists, an exception will be thrown. If you want to force the
   * object to be store you should instead use the addOrReplace method.
   * @param type the type of the object to store
   * @param key the key of the object to store within the type
   * @param arguments a Map of key-value pairs representing the object to store
  */
  add(type: string, key: string, ...arguments: any[]): void;
  /**
   * Add a new object in the registry or replace an existing one. The object is a map of key-value pairs that will be
   * stored using the specified type and key. If the object already exists, it will be replaced by the new one.
   * @param type the type of the object to store
   * @param key the key of the object to store within the type
   * @param arguments a Map of key-value pairs representing the object to store
  */
  addOrReplace(type: string, key: string, ...arguments: any[]): void;
  /**
   * Remove an object from the registry by type and key
   * @param type the type of the object to remove
   * @param key the key of the object to remove within the type
  */
  remove(type: string, key: string): void;
}
/**
 * Helper class to provide rendering functions to the Javascript engine
*/
export class RenderHelper {
  transformToJsNode(node: JCRNodeWrapper, includeChildren: boolean, includeDescendants: boolean, includeAllTranslations: boolean): any;
  /**
   * Get the render parameters for the given resource
   * @param resource the resource for which to retrieve the render parameters
   * @return a Map<String,Object> containing the render parameters
  */
  getRenderParameters(resource: Resource): any;
  /**
   * Does a URL encoding of the path. The characters that
   * don't need encoding are those defined 'unreserved' in section 2.3 of
   * the 'URI generic syntax' RFC 2396. Not the entire path string is escaped,
   * but every individual part (i.e. the slashes are not escaped).
   * @param path the path to encode
   * @return a String containing the escaped path
   * @throws NullPointerException if path is null.
  */
  escapePath(path: string): string;
  /**
   * Find the first displayable node in the given node's hierarchy. A displayable node is a node that has a content
   * or page template associated with it.
   * @param node the node at which to start the resolution
   * @param renderContext the current render context
   * @param contextSite the site in which to resolve the template
   * @return the first displayable {@link JCRNodeWrapper} found in the hierarchy
  */
  findDisplayableNode(node: JCRNodeWrapper, renderContext: RenderContext, contextSite: JCRSiteNode): JCRNodeWrapper;
  /**
   * Returns the node which corresponds to the bound component of the j:bindedComponent property in the specified node.
   * @param node the node to get the bound component for
   * @param context current render context
   * @return the bound {@link JCRNodeWrapper}
  */
  getBoundNode(node: JCRNodeWrapper, context: RenderContext): JCRNodeWrapper;
  renderComponent(attr: any, renderContext: RenderContext): string;
  createContentButtons(childName: string, nodeTypes: string, editCheck: boolean, renderContext: RenderContext, currentResource: Resource): string;
  render(attr: any, renderContext: RenderContext, currentResource: Resource): string;
  /**
   * Render a tag that adds resources to the page. Resources might for example be CSS files, Javascript files or inline
   * @param attr may contain the following:
   *             
   *              insert (boolean) : If true, the resource will be inserted into the document. Typically used
   *             for on-demand loading of resources. 
   *              async (boolean) : If true, the resource will be loaded asynchronously. For scripts, this means
   *             the script
   *             will be executed as soon as it's available, without blocking the rest of the page. 
   *              defer (boolean) : If true, the resource will be deferred, i.e., loaded after the document
   *             has been parsed.
   *             For scripts, this means the script will not be executed until after the page has loaded. 
   *              type (string) : The type of the resource. This could be 'javascript' for .js files, 'css' for
   *             .css files, etc.
   *             The type will be used to resolve the directory in the module where the resources are located. For example
   *             for the 'css' type it will look for the resources in the css directory of the module. 
   *              resources (string) : The path to the resource file, relative to the module. It is also allowed to
   *             specify multiple resources by separating them with commas. It is also allowed to use absolute URLs to
   *             include remote resources. 
   *              inlineResource (string) : Inline HTML that markup will be considered as a resource. 
   *              title (string) : The title of the resource. This is typically not used for scripts or stylesheets,
   *             but may be used for other types of resources. 
   *              key (string) : A unique key for the resource. This could be used to prevent duplicate resources
   *             from being added to the document. 
   *              targetTag (string): The HTML tag where the resource should be added. This could be 'head' for
   *             resources that should be added to the <head> tag, 'body' for resources that should be added to
   *             the <body> tag, etc.
   *              rel (string) : The relationship of the resource to the document. This is typically 'stylesheet'
   *             for CSS files. 
   *              media (string) : The media for which the resource is intended. This is typically used for CSS
   *             files, with values like 'screen', 'print', etc. 
   *              condition (string) : A condition that must be met for the resource to be loaded. This could be
   *             used for conditional comments in IE, for example.
   *             
   * @param renderContext the current rendering context
   * @return a String containing the rendered HTML tags for the provided resources.
   * @throws IllegalAccessException if the underlying tag cannot be accessed
   * @throws InvocationTargetException if the underlying tag cannot be invoked
   * @throws JspException if the underlying tag throws a JSP exception
   * @throws IOException if the underlying tag throws an IO exception
  */
  addResources(attr: any, renderContext: RenderContext): string;
  /**
   * Add a cache dependency to the current resource. This will be used to flush the current resource when the
   * dependencies are modified.
   * @param attr may be the following:
   *             
   *              node (JCRNodeWrapper) : The node to add as a dependency. 
   *              uuid (String) : The UUID of the node to add as a dependency. 
   *              path (String) : The path of the node to add as a dependency. 
   *              flushOnPathMatchingRegexp (String) : A regular expression that will be used to flush the cache
   *             when the path of the modified nodes matches the regular expression. 
   *             
   * @param renderContext the current rendering context
   * @throws IllegalAccessException if the underlying tag cannot be accessed
   * @throws InvocationTargetException if the underlying tag cannot be invoked
   * @throws JspException if the underlying tag throws a JSP exception
   * @throws IOException if the underlying tag throws an IO exception
  */
  addCacheDependency(attr: any, renderContext: RenderContext): void;
  renderAbsoluteArea(attr: any, renderContext: RenderContext): string;
  renderArea(attr: any, renderContext: RenderContext): string;
}

}
