declare module 'org.jahia.services.content.decorator' {
import { Locale, Set, List } from 'java.util';
import { JCRNodeWrapper } from 'org.jahia.services.content';
/**
 * JCR node representing the Jahia virtual site.
 *
 * User: toto
 * Date: Mar 30, 2010
 * Time: 12:37:45 PM
*/
export class JCRSiteNode {
  /**
   * @return list of inactive live languages
  */
  getInactiveLiveLanguages(): Set<string>;
  /**
   * @return list of inactive languages
  */
  getInactiveLanguages(): Set<string>;
  /**
   * @deprecated use either {@link #getActiveLiveLanguagesAsLocales} or {@link #getActiveLiveLanguages()} methods instead
  */
  getActiveLanguagesAsLocales(): Locale[];
  /**
   * @deprecated use {@link #getActiveLiveLanguages} method instead
  */
  getActiveLanguages(): Set<string>;
  /**
   * Returns a set of active site languages
   *
   * @return a set of active site languages
  */
  getActiveLiveLanguages(): Set<string>;
  /**
   * Returns an List of active site language  ( as Locale ).
   *
   * @return a List of Locale elements
  */
  getActiveLiveLanguagesAsLocales(): Locale[];
  /**
   * Returns an List of inactive site language  ( as Locale ).
   *
   * @return a List of Locale elements
  */
  getInactiveLanguagesAsLocales(): Locale[];
  getDefaultLanguage(): string;
  getDescr(): string;
  getHome(): JCRNodeWrapper;
  getLanguages(): Set<string>;
  /**
   * Returns an List of site language  ( as Locale ).
   *
   * @return an List of Locale elements.
  */
  getLanguagesAsLocales(): Locale[];
  getMandatoryLanguages(): Set<string>;
  getResolveSite(): JCRSiteNode;
  getServerName(): string;
  getServerNameAliases(): string[];
  getAllServerNames(): string[];
  getInstalledModules(): string[];
  /**
   * Returns a set of all installed modules for this site, their direct and transitive dependencies (the whole dependency tree).
   *
   * @return a set of all installed modules for this site, their direct and transitive dependencies (the whole dependency tree)
  */
  getInstalledModulesWithAllDependencies(): Set<string>;
  /**
   * Get installed modules with their dependencies
   * @return
  */
  getAllInstalledModules(): string[];
  /**
   * Returns the corresponding template set name of this virtual site.
   *
   * @return the corresponding template set name of this virtual site
  */
  getTemplatePackageName(): string;
  getTitle(): string;
  isHtmlMarkupFilteringEnabled(): boolean;
  isMixLanguagesActive(): boolean;
  isAllowsUnlistedLanguages(): boolean;
  isWCAGComplianceCheckEnabled(): boolean;
  /**
   * Returns true if this site is the default one on the server.
   *
   * @return true if this site is the default one on the server
  */
  isDefault(): boolean;
}

}
