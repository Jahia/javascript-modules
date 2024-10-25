declare module 'org.jahia.services.render' {
import { Locale, Set, List, Map } from 'java.util';
import { JCRNodeWrapper } from 'org.jahia.services.content';
import { HttpServletRequest, HttpServletResponse } from 'javax.servlet.http';
import { JCRSiteNode } from 'org.jahia.services.content.decorator';
import { JahiaUser } from 'org.jahia.services.usermanager';
/**
 * Template rendering context with the information about current request/response pair and optional template parameters.
 *
 * @author toto
*/
export class RenderContext {
  getRequest(): HttpServletRequest;
  getResponse(): HttpServletResponse;
  getUser(): JahiaUser;
  getSite(): JCRSiteNode;
  getURLGenerator(): URLGenerator;
  getDisplayedModules(): Set<string>;
  isEditMode(): boolean;
  getMode(): string;
  getEditModeConfigName(): string;
  getServletPath(): string;
  getWorkspace(): string;
  isContributionMode(): boolean;
  isLoggedIn(): boolean;
  getTemplatesCacheExpiration(): Map<string, Map<string, number>>;
  getMainResource(): Resource;
  getContentType(): string;
  getRenderedPaths(): Set<string>;
  getMainResourceLocale(): Locale;
  getUILocale(): Locale;
  getFallbackLocale(): Locale;
  isLiveMode(): boolean;
  isPreviewMode(): boolean;
  isAjaxRequest(): boolean;
  getAjaxResource(): Resource;
  /**
   * @return the redirect
  */
  getRedirect(): string;
  isEnterpriseEdition(): boolean;
  /**
   * @param node to check
   * @return true if the node is visible (in visibleTypes or without nonVisibleTypes)
   * @throws javax.jcr.RepositoryException
  */
  isVisible(node: JCRNodeWrapper): boolean;
  /**
   * @param node to check
   * @return true if the node is editable (in editableTypes or without nonEditableTypes)
   * @throws RepositoryException in case of JCR-related errors
  */
  isEditable(node: JCRNodeWrapper): boolean;
  isForceUILocaleForJCRSession(): boolean;
  isUgcEnabled(): boolean;
  /**
   * @return Whether the application is in read only mode, dependent on read only, full read only, and maintenance status currently activated/deactivated.
  */
  isReadOnly(): boolean;
}
/**
 * A resource is the aggregation of a node and a specific template
 * It's something that can be handled by the render engine to be displayed.
 *
 * @author toto
*/
export class Resource {
  /**
   * Get the node associated to the current resource, in case of a lazy resource the node will be load from jcr if it's null
   * This function shouldn't not be call before the CacheFilter to avoid loading of node from JCR.
   * Since CacheFilter is executed for each fragments now even if there are in cache.
   *
   * If the node is needed it should be requested after the CacheFilter or for cache key generation during aggregation
   *
   * @return The JCR Node if found, null if not
  */
  getNode(): JCRNodeWrapper;
  /**
   * Know if the JCR Node is available immediately, since the node may require lazy loading from JCR
   * @return true if JCR Node is available immediately
  */
  isNodeLoaded(): boolean;
  getTemplateType(): string;
  getWorkspace(): string;
  getLocale(): Locale;
  getContextConfiguration(): string;
  getResolvedTemplate(): string;
  getTemplate(): string;
  getDependencies(): Set<string>;
  getRegexpDependencies(): Set<string>;
  getMissingResources(): string[];
  getPath(): string;
  getNodePath(): string;
}
/**
 * Main URL generation class. This class is exposed to the template developers to make it easy to them to access basic URLs such as ${url.edit}, ${url.userProfile}. User: toto Date: Sep 14, 2009 Time: 11:13:37 AM
*/
export class URLGenerator {
  getResourcePath(): string;
  getContext(): string;
  getFiles(): string;
  getFilesPlaceholders(): string;
  getBase(): string;
  getBasePlaceholders(): string;
  getLive(): string;
  getEdit(): string;
  getPreview(): string;
  getContribute(): string;
  /**
   * Returns the URL for the current resource in studio mode.
   *
   * @return the URL for the current resource in studio mode
  */
  getStudio(): string;
  /**
   * Returns the URL for the current resource in visual studio mode.
   *
   * @return the URL for the current resource in visual studio mode
  */
  getStudioVisual(): string;
  getLogout(): string;
  getCurrentModule(): string;
  getCurrent(): string;
  getLanguages(): Map<string, string>;
  getLanguage(languageCode: string): string;
  getTemplates(): Map<string, string>;
  getTemplate(template: string): string;
  getTemplateTypes(): Map<string, string>;
  getTemplateType(templateType: string): string;
  getBases(): Map<string, string>;
  getBase(languageCode: string): string;
  /**
   * Returns the path to the templates folder.
   *
   * @return the path to the templates folder
  */
  getTemplatesPath(): string;
  /**
   * Returns the URL of the main resource (normally, page), depending on the current mode.
   *
   * @return the URL of the main resource (normally, page), depending on the current mode
  */
  getMainResource(): string;
  getInitializers(): string;
  getBaseContribute(): string;
  getBaseEdit(): string;
  getBaseLive(): string;
  getBasePreview(): string;
  getConvert(): string;
  getBaseUserBoardEdit(): string;
  getBaseUserBoardLive(): string;
  getBaseUserBoardFrameEdit(): string;
  getBaseUserBoardFrameLive(): string;
  getRealResource(): string;
  /**
   * Returns the server URL, including scheme, host and port, depending on the current site. The URL is in the form :, e.g. http://www.jahia.org:8080. The port is omitted in case of standard
   * HTTP (80) and HTTPS (443) ports.
   * 
   * If the site's server name is configured to be "localhost", then take the servername from the request.
   *
   * @return the server URL, including scheme, host and port, depending on the current site
  */
  getServer(): string;
  getMyProfile(): string;
  getLogin(): string;
}

}
