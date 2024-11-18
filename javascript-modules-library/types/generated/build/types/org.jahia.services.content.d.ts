declare module 'org.jahia.services.content' {
import { ServletRequest } from 'javax.servlet';
import { Locale, List, Map, Date } from 'java.util';
import { HttpServletRequest } from 'javax.servlet.http';
import { QueryWrapper } from 'org.jahia.services.query';
import { JCRSiteNode } from 'org.jahia.services.content.decorator';
import { JahiaUser } from 'org.jahia.services.usermanager';
import { NodeIterator, Item, Node, PropertyIterator, Binary, Property } from 'javax.jcr';
export class JCRCallback<T> {
  /**
   * Called by {@link JCRTemplate} within an active JCR
   * {@link javax.jcr.JCRSession}. It is not responsible for logging
   * out of the Session or handling transactions.
   *
   * Allows for returning a result object created within the
   * callback, i.e. a domain object or a collection of domain
   * objects. A thrown {@link RuntimeException} is treated as an
   * application exception; it is propagated to the caller of the
   * template.
   *
   * @param session
   *            session passed by the JCRTemplate
   * @return a result object returned by the action, or null
   * @throws RepositoryException in case of JCR errors
  */
  doInJCR(session: JCRSessionWrapper): T;
}
/**
 * Interface for wrappers around javax.jcr.Item to be able to inject
 * Jahia specific actions.
 *
 * Jahia services should use this interface rather than the original to ensure that
 * we manipulate wrapped nodes and not the ones from the underlying implementation
 *
 * @author toto
*/
export class JCRItemWrapper {
  /**
   * {@inheritDoc}
   * @return The wrapped ancestor of this
   *         Item at the specified depth.
  */
  getAncestor(depth: number): JCRItemWrapper;
  /**
   * {@inheritDoc}
   * @return The wrapped parent of this Item.
  */
  getParent(): JCRNodeWrapper;
  /**
   * {@inheritDoc}
   * @return the JCRSessionWrapper through which this Item was
   *         acquired.
  */
  getSession(): JCRSessionWrapper;
  getCanonicalPath(): string;
  /**
   * Returns the normalized absolute path to this item.
   *
   * @return the normalized absolute path of this Item.
   * @throws RepositoryException if an error occurs.
  */
  getPath(): string;
  /**
   * Returns the name of this Item in qualified form. If this
   * Item is the root node of the workspace, an empty string is
   * returned.
   *
   * @return the name of this Item in qualified form or an empty
   *         string if this Item is the root node of a
   *         workspace.
   * @throws RepositoryException if an error occurs.
  */
  getName(): string;
  /**
   * Returns the depth of this Item in the workspace item graph.
   *  The root node returns 0. A property or child node of the
   * root node returns 1. A property or child node of a child node of the
   * root returns 2. And so on to this Item. 
   *
   * @return The depth of this Item in the workspace item graph.
   * @throws RepositoryException if an error occurs.
  */
  getDepth(): number;
  /**
   * Indicates whether this Item is a Node or a
   * Property. Returns true if this
   * Item is a Node; Returns false if
   * this Item is a Property.
   *
   * @return true if this Item is a
   *         Node, false if it is a
   *         Property.
  */
  isNode(): boolean;
  /**
   * Returns true if this is a new item, meaning that it exists
   * only in transient storage on the Session and has not yet
   * been saved. Within a transaction, isNew on an
   * Item may return false (because the item has
   * been saved) even if that Item is not in persistent storage
   * (because the transaction has not yet been committed).
   * 
   * Note that if an item returns true on isNew,
   * then by definition is parent will return true on
   * isModified.
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is new; false
   *         otherwise.
  */
  isNew(): boolean;
  /**
   * Returns true if this Item has been saved but
   * has subsequently been modified through the current session and therefore
   * the state of this item as recorded in the session differs from the state
   * of this item as saved. Within a transaction, isModified on
   * an Item may return false (because the
   * Item has been saved since the modification) even if the
   * modification in question is not in persistent storage (because the
   * transaction has not yet been committed).
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is modified; false
   *         otherwise.
  */
  isModified(): boolean;
  /**
   * Returns true if this Item object (the Java
   * object instance) represents the same actual workspace item as the object
   * otherItem.
   * 
   * Two Item objects represent the same workspace item if and
   * only if all the following are true:  Both objects were acquired
   * through Session objects that were created by the same
   * Repository object. Both objects were acquired
   * through Session objects bound to the same repository
   * workspace. The objects are either both Node objects
   * or both Property objects. If they are
   * Node objects, they have the same identifier. If
   * they are Property objects they have identical names and
   * isSame is true of their parent nodes.  This method
   * does not compare the states of the two items. For example, if two
   * Item objects representing the same actual workspace item
   * have been retrieved through two different sessions and one has been
   * modified, then this method will still return true when
   * comparing these two objects. Note that if two Item objects
   * representing the same workspace item are retrieved through the
   * same session they will always reflect the same state.
   *
   * @param otherItem the Item object to be tested for identity
   *                  with this Item.
   * @return true if this Item object and
   *         otherItem represent the same actual repository item;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  isSame(otherItem: Item): boolean;
}
/**
 * @author Christophe Laprun
*/
export class JCRNodeIteratorWrapper {
  /**
   * Returns the next Node in the iteration.
   *
   * @return the next Node in the iteration.
   * @throws java.util.NoSuchElementException
   *          if iteration has no more
   *          Nodes.
  */
  nextNode(): Node;
  /**
   * Returns `true` if the iteration has more elements.
   * (In other words, returns `true` if {@link #next} would
   * return an element rather than throwing an exception.)
   *
   * @return `true` if the iteration has more elements
  */
  hasNext(): boolean;
}
/**
 * Interface for wrappers around javax.jcr.Node to be able to inject
 * Jahia specific actions.
 * 
 * Jahia services should use this interface rather than the original to ensure that
 * we manipulate wrapped nodes and not the ones from the underlying implementation
 *
 * @author toto
*/
export class JCRNodeWrapper {
  /**
   * {@inheritDoc}
   *
   * @return The wrapped node at relPath.
  */
  getNode(relPath: string): JCRNodeWrapper;
  /**
   * {@inheritDoc}
   *
   * @return The wrapped property at relPath.
  */
  getProperty(relPath: string): JCRPropertyWrapper;
  /**
   * Checks if the current user has a permission or not
   *
   * @param perm The permission to check
   * @return If the permission is allowed
  */
  hasPermission(perm: string): boolean;
  /**
   * Get the absolute file content url
   *
   * @param request the current request.
   * @return the absolute file content url
  */
  getAbsoluteUrl(request: ServletRequest): string;
  /**
   * Get the file content url
   *
   * @return the file content url
  */
  getUrl(): string;
  /**
   * Get the file content url with optional params
   *
   * @return the file content url
  */
  getUrl(params: string[]): string;
  /**
   * Get the absolute webdav url
   *
   * @return the absolute webdav url
  */
  getAbsoluteWebdavUrl(request: HttpServletRequest): string;
  /**
   * Get the webdav url
   *
   * @return the webdav url
  */
  getWebdavUrl(): string;
  /**
   * Get the file content url for a specific thumbnail
   *
   * @param name The thumbnail name
   * @return the file content url for a specific thumbnail
  */
  getThumbnailUrl(name: string): string;
  /**
   * Get a map of all available thumbnails and its URLs.
   *
   * @return a map of all available thumbnails and its URLs.
  */
  getThumbnailUrls(): Map<string, string>;
  /**
   * Returns a map of all property names of this node accessible through the current Session with the value as String.
   *
   * @return a map of all property names and its String values
   * @throws RepositoryException in case of JCR-related errors
  */
  getPropertiesAsString(): Map<string, string>;
  /**
   * Returns the name of the primary node type in effect for this node.
   *
   * @return the name of the primary node type
   * @throws RepositoryException in case of JCR-related errors
  */
  getPrimaryNodeTypeName(): string;
  /**
   * Returns a list holding the primary node type and all mixin node types for this node
   *
   * @return a list holding the primary node type and all mixin node types
   * @throws RepositoryException in case of JCR-related errors
  */
  getNodeTypes(): string[];
  /**
   * Checks whether the current node is a collection node
   *
   * @return true if current node is a collection node
  */
  isCollection(): boolean;
  /**
   * Checks whether the current node is a file node
   *
   * @return true if current node is a file node
  */
  isFile(): boolean;
  /**
   * Checks whether the current node is a portlet node
   *
   * @return true if current node is a portlet node
  */
  isPortlet(): boolean;
  /**
   * Returns the last node modification date as Date object
   *
   * @return the last node modification date as Date object
  */
  getLastModifiedAsDate(): Date;
  /**
   * Returns the last node published date as Date object
   *
   * @return the last node published date as Date object
  */
  getLastPublishedAsDate(): Date;
  /**
   * Returns the last content modification date as Date object
   *
   * @return the last content modification date as Date object
  */
  getContentLastModifiedAsDate(): Date;
  /**
   * Returns the last content published date as Date object
   *
   * @return the last content published date as Date object
  */
  getContentLastPublishedAsDate(): Date;
  /**
   * Returns the node creation date as Date object
   *
   * @return the node creation date as Date object
  */
  getCreationDateAsDate(): Date;
  /**
   * Returns the user name who created this node
   *
   * @return the user name who created this node
  */
  getCreationUser(): string;
  /**
   * Returns the user name who last modified this node
   *
   * @return the user name who last modified this node
  */
  getModificationUser(): string;
  /**
   * Returns the user name who last published this node
   *
   * @return the user name who last published this node
  */
  getPublicationUser(): string;
  /**
   * Returns the language code of this node
   *
   * @return the language code of this node
  */
  getLanguage(): string;
  /**
   * Returns the property value as String at name relative to this
   * node.
   *
   * @param name The relative path of the property to retrieve.
   * @return the property value as String
  */
  getPropertyAsString(name: string): string;
  /**
   * Returns a list of all the ancestor of this item.
   *
   * @return a list of all the ancestor of this item.
   * @throws RepositoryException in case of JCR-related errors
  */
  getAncestors(): JCRItemWrapper[];
  /**
   * {@inheritDoc}
  */
  isLocked(): boolean;
  /**
   * Checks whether the current file node has a mix:versionable mixin type applied
   *
   * @return whether current file has mix:versionable
  */
  isVersioned(): boolean;
  /**
   * Check whether the current node is of mixin type mix:lockable
   *
   * @return true if node can be locked
  */
  isLockable(): boolean;
  /**
   * {@inheritDoc}
  */
  getName(): string;
  /**
   * {@inheritDoc}
  */
  getPath(): string;
  /**
   * Returns available translation sub-nodes of this node.
   *
   * @return available translation sub-nodes of this node
   * @throws RepositoryException in case of a JCR exception
  */
  getI18Ns(): NodeIterator;
  /**
   * Checks if the translation node exists
   * Use only in un-localized session
   *
   * @param locale
   * @return true if the translation node exists
   * @throws RepositoryException in case of JCR-related errors
  */
  hasI18N(locale: Locale): boolean;
  /**
   * Checks if the translation node exists
   * Use only in un-localized session
   *
   * @param locale   the locale for which we want to check if a translation exists
   * @param fallback whether or not we should fallback on the default locale if we didn't find an exact translation
   * @return true if the translation node exists
   * @throws RepositoryException in case of JCR-related errors
  */
  hasI18N(locale: Locale, fallback: boolean): boolean;
  /**
   * Retrieves the list of locales available on a node.
   *
   * @return a list of the locales that exist on this node.
   * @throws RepositoryException in case of JCR-related errors
  */
  getExistingLocales(): Locale[];
  getResolveSite(): JCRSiteNode;
  hasTranslations(): boolean;
  getDisplayableName(): string;
  /**
   * Returns true if this node is marked for deletion.
   *
   * @return true if this node is marked for deletion.
   * @throws RepositoryException in case of a repository access error
  */
  isMarkedForDeletion(): boolean;
  /**
   * Returns all child nodes of this node accessible through the current
   * Session. Does not include properties of this
   * Node. The same reacquisition semantics apply as with {@link
   * #getNode(String)}. If this node has no accessible child nodes, then an
   * empty iterator is returned.
   *
   * @return A NodeIterator over all child Nodes of
   *         this Node.
   * @throws RepositoryException if an error occurs.
  */
  getNodes(): JCRNodeIteratorWrapper;
  /**
   * Gets all child nodes of this node accessible through the current
   * Session that match namePattern. The pattern may
   * be a full name or a partial name with one or more wildcard characters
   * ("*"), or a disjunction (using the "|"
   * character to represent logical OR) of these. For example,
   * 
   * N.getNodes("jcr:* | myapp:report | my doc")
   * 
   * would return a NodeIterator holding all accessible child
   * nodes of N that are either called 'myapp:report',
   * begin with the prefix 'jcr:' or are called 'my
   * doc'.
   * 
   * The substrings within the pattern that are delimited by "|"
   * characters and which may contain wildcard characters ("*")
   * are called globs.
   * 
   * Note that leading and trailing whitespace around a glob is ignored, but
   * whitespace within a disjunct forms part of the pattern to be matched.
   * 
   * The pattern is matched against the names (not the paths) of the immediate
   * child nodes of this node.
   * 
   * If this node has no accessible matching child nodes, then an empty
   * iterator is returned.
   * 
   * The same reacquisition semantics apply as with {@link
   * #getNode(String)}.
   *
   * @param namePattern a name pattern.
   * @return a NodeIterator.
   * @throws RepositoryException if an unexpected error occurs.
  */
  getNodes(namePattern: string): JCRNodeIteratorWrapper;
  /**
   * Gets all child nodes of this node accessible through the current
   * Session that match one or more of the nameGlob
   * strings in the passed array.
   * 
   * A glob may be a full name or a partial name with one or more wildcard
   * characters ("*"). For example,
   * 
   * N.getNodes(new String[] {"jcr:*", "myapp:report", "my
   * doc"})
   * 
   * would return a NodeIterator holding all accessible child
   * nodes of N that are either called 'myapp:report',
   * begin with the prefix 'jcr:' or are called 'my
   * doc'.
   * 
   * Note that unlike in the case of the {@link #getNodes(String)} leading and
   * trailing whitespace around a glob is not ignored.
   * 
   * The globs are matched against the names (not the paths) of the immediate
   * child nodes of this node.
   * 
   * If this node has no accessible matching child nodes, then an empty
   * iterator is returned.
   * 
   * The same reacquisition semantics apply as with {@link
   * #getNode(String)}.
   *
   * @param nameGlobs an array of globbing strings.
   * @return a NodeIterator.
   * @throws RepositoryException if an unexpected error occurs.
   * @since JCR 2.0
  */
  getNodes(nameGlobs: string[]): JCRNodeIteratorWrapper;
  /**
   * Returns all properties of this node accessible through the current
   * Session. Does not include child nodes of this
   * node. The same reacquisition semantics apply as with {@link
   * #getNode(String)}. If this node has no accessible properties, then
   * an empty iterator is returned.
   *
   * @return A PropertyIterator.
   * @throws RepositoryException if an error occurs.
  */
  getProperties(): PropertyIterator;
  /**
   * Gets all properties of this node accessible through the current
   * Session that match namePattern. The pattern may
   * be a full name or a partial name with one or more wildcard characters
   * ("*"), or a disjunction (using the "|"
   * character to represent logical OR) of these. For example,
   * 
   * N.getProperties("jcr:* | myapp:name | my doc")
   * 
   * would return a PropertyIterator holding all accessible
   * properties of N that are either called
   * 'myapp:name', begin with the prefix 'jcr:' or
   * are called 'my doc'.
   * 
   * 
   * The substrings within the pattern that are delimited by "|"
   * characters and which may contain wildcard characters ("*")
   * are called globs.
   * 
   * Note that leading and trailing whitespace around a glob is ignored, but
   * whitespace within a disjunct forms part of the pattern to be matched.
   * 
   * The pattern is matched against the names (not the paths) of the immediate
   * child properties of this node.
   * 
   * If this node has no accessible matching properties, then an empty
   * iterator is returned.
   * 
   * The same reacquisition semantics apply as with {@link
   * #getNode(String)}.
   *
   * @param namePattern a name pattern.
   * @return a PropertyIterator.
   * @throws RepositoryException if an unexpected error occurs.
  */
  getProperties(namePattern: string): PropertyIterator;
  /**
   * Gets all properties of this node accessible through the current
   * Session that match one or more of the nameGlob
   * strings in the passed array.
   * 
   * A glob may be a full name or a partial name with one or more wildcard
   * characters ("*"). For example,
   * 
   * N.getProperties(new String[] {"jcr:*", "myapp:report", "my
   * doc"})
   * 
   * would return a PropertyIterator holding all accessible
   * properties of N that are either called
   * 'myapp:report', begin with the prefix 'jcr:' or
   * are called 'my doc'.
   * 
   * Note that unlike in the case of the {@link #getProperties(String)}
   * leading and trailing whitespace around a glob is not ignored.
   * 
   * The globs are matched against the names (not the paths) of the properties
   * of this node.
   * 
   * If this node has no accessible matching properties, then an empty
   * iterator is returned.
   * 
   * The same reacquisition semantics apply as with {@link
   * #getProperty(String)}.
   *
   * @param nameGlobs an array of globbing strings.
   * @return a PropertyIterator.
   * @throws RepositoryException if an unexpected error occurs.
   * @since JCR 2.0
  */
  getProperties(nameGlobs: string[]): PropertyIterator;
  /**
   * Returns the UUID of this node as recorded in this node's
   * jcr:uuid property. This method only works on nodes of mixin
   * node type mix:referenceable.
   * 
   * On nonreferenceable nodes, this method throws an UnsupportedRepositoryOperationException.
   * To avoid throwing an exception to determine whether a node has a UUID, a
   * call to {@link #isNodeType(String) isNodeType("mix:referenceable")} can
   * be made.
   *
   * @return the UUID of this node.
   * @throws UnsupportedRepositoryOperationException
   *                             if this node
   *                             nonreferenceable.
   * @throws RepositoryException if another error occurs.
   * @deprecated As of JCR 2.0, {@link #getIdentifier()} should be used
   *             instead.
  */
  getUUID(): string;
  /**
   * Returns the identifier of this node. Applies to both referenceable and
   * non-referenceable nodes.
   * 
   * A RepositoryException is thrown if an error occurs.
   *
   * @return the identifier of this node.
   * @throws RepositoryException if an error occurs.
   * @since JCR 2.0
  */
  getIdentifier(): string;
  /**
   * This method returns all REFERENCE properties that refer to
   * this node and that are accessible through the current
   * Session. Equivalent to Node.getReferences(null).
   * 
   * If this node has no referring REFERENCE properties, an
   * empty iterator is returned. This includes the case where this node is not referenceable.
   *
   * @return A PropertyIterator.
   * @throws RepositoryException if an error occurs.
   * @see #getReferences(String).
  */
  getReferences(): PropertyIterator;
  /**
   * This method returns all REFERENCE properties that refer to
   * this node, have the specified name and that are accessible
   * through the current Session.
   * 
   * If the name parameter is null then all
   * referring REFERENCES are returned regardless of name.
   * 
   * Some implementations may only return properties that have been persisted.
   * Some may return both properties that have been persisted and those that
   * have been dispatched but not persisted (for example, those saved within a
   * transaction but not yet committed) while others implementations may
   * return these two categories of property as well as properties that are
   * still pending and not yet dispatched.
   * 
   * In implementations that support versioning, this method does not return
   * properties that are part of the frozen state of a version in version
   * storage.
   * 
   * If this node has no referring REFERENCE properties with the specified name, an
   * empty iterator is returned. This includes the case where this node is not referenceable.
   *
   * @param name name of referring REFERENCE properties to be
   *             returned; if null then all referring REFERENCEs
   *             are returned.
   * @return A PropertyIterator.
   * @throws RepositoryException if an error occurs.
   * @since JCR 2.0
  */
  getReferences(name: string): PropertyIterator;
  /**
   * This method returns all WEAKREFERENCE properties that refer
   * to this node and that are accessible through the current
   * Session. Equivalent to Node.getWeakReferences(null).
   * 
   * If this node has no referring WEAKREFERENCE properties, an
   * empty iterator is returned. This includes the case where this node is not referenceable.
   *
   * @return A PropertyIterator.
   * @throws RepositoryException if an error occurs.
   * @see #getWeakReferences(String).
   * @since JCR 2.0
  */
  getWeakReferences(): PropertyIterator;
  /**
   * This method returns all WEAKREFERENCE properties that refer
   * to this node, have the specified name and that are
   * accessible through the current Session.
   * 
   * If the name parameter is null then all
   * referring WEAKREFERENCE are returned regardless of name.
   * 
   * Some implementations may only return properties that have been persisted.
   * Some may return both properties that have been persisted and those that
   * have been dispatched but not persisted (for example, those saved within a
   * transaction but not yet committed) while others implementations may
   * return these two categories of property as well as properties that are
   * still pending and not yet dispatched.
   * 
   * In implementations that support versioning, this method does not return
   * properties that are part of the frozen state of a version in version
   * storage.
   * 
   * If this node has no referring WEAKREFERENCE properties with the specified name, an
   * empty iterator is returned. This includes the case where this node is not referenceable.
   *
   * @param name name of referring WEAKREFERENCE properties to be
   *             returned; if null then all referring
   *             WEAKREFERENCEs are returned.
   * @return A PropertyIterator.
   * @throws RepositoryException if an error occurs.
   * @since JCR 2.0
  */
  getWeakReferences(name: string): PropertyIterator;
  /**
   * Indicates whether a node exists at relPath Returns
   * true if a node accessible through the current
   * Session exists at relPath and
   * false otherwise.
   *
   * @param relPath The path of a (possible) node.
   * @return true if a node exists at relPath;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  hasNode(relPath: string): boolean;
  /**
   * Indicates whether a property exists at relPath Returns
   * true if a property accessible through the current
   * Session exists at relPath and
   * false otherwise.
   *
   * @param relPath The path of a (possible) property.
   * @return true if a property exists at relPath;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  hasProperty(relPath: string): boolean;
  /**
   * Indicates whether this node has child nodes. Returns true if
   * this node has one or more child nodes accessible through the current
   * Session; false otherwise.
   *
   * @return true if this node has one or more child nodes;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  hasNodes(): boolean;
  /**
   * Indicates whether this node has properties. Returns true if
   * this node has one or more properties accessible through the current
   * Session; false otherwise.
   *
   * @return true if this node has one or more properties;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  hasProperties(): boolean;
  /**
   * Returns true if this node is of the specified primary node
   * type or mixin type, or a subtype thereof. Returns false
   * otherwise.
   * 
   * This method respects the effective node type of the node.
   *
   * @param nodeTypeName the name of a node type.
   * @return true If this node is of the specified primary node
   *         type or mixin type, or a subtype thereof. Returns
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  isNodeType(nodeTypeName: string): boolean;
  /**
   * Returns false if this node is currently in the checked-in state
   * (either due to its own status as a versionable node or due to the effect of
   * a versionable node being checked in above it). Otherwise this method returns
   * true. This includes the case where the repository does not
   * support versioning (and therefore all nodes are always "checked-out",
   * by default).
   *
   * @return a boolean
   * @throws RepositoryException if an error occurs.
  */
  isCheckedOut(): boolean;
  /**
   * Returns the ancestor of this Item at the specified depth. An
   * ancestor of depth x is the Item that is x
   * levels down along the path from the root node to this
   * Item.  depth = 0 returns the root node of a
   * workspace. depth = 1 returns the child of the root node along
   * the path to this Item. depth = 2 returns
   * the grandchild of the root node along the path to this
   * Item. And so on to depth = n, where
   * n is the depth of this Item, which returns
   * this Item itself. 
   * 
   * If this node has more than one path (i.e., if it is a descendant of a
   * shared node) then the path used to define the ancestor is
   * implementaion-dependent.
   *
   * @param depth An integer, 0 <= depth <= n where
   *              n is the depth of this Item.
   * @return The ancestor of this Item at the specified
   *         depth.
   * @throws ItemNotFoundException if depth < 0 or depth >
   *                               n where n is the is the depth of this item.
   * @throws AccessDeniedException if the current session does not have
   *                               sufficent access to retrieve the specified node.
   * @throws RepositoryException   if another error occurs.
  */
  getAncestor(depth: number): Item;
  /**
   * Returns the parent of this Item.
   *
   * @return The parent of this Item.
   * @throws ItemNotFoundException if this Item is the root node
   *                               of a workspace.
   * @throws AccessDeniedException if the current session does not have
   *                               sufficent access to retrieve the parent of this item.
   * @throws RepositoryException   if another error occurs.
  */
  getParent(): Node;
  /**
   * Indicates whether this Item is a Node or a
   * Property. Returns true if this
   * Item is a Node; Returns false if
   * this Item is a Property.
   *
   * @return true if this Item is a
   *         Node, false if it is a
   *         Property.
  */
  isNode(): boolean;
  /**
   * Returns true if this is a new item, meaning that it exists
   * only in transient storage on the Session and has not yet
   * been saved. Within a transaction, isNew on an
   * Item may return false (because the item has
   * been saved) even if that Item is not in persistent storage
   * (because the transaction has not yet been committed).
   * 
   * Note that if an item returns true on isNew,
   * then by definition is parent will return true on
   * isModified.
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is new; false
   *         otherwise.
  */
  isNew(): boolean;
  /**
   * Returns true if this Item has been saved but
   * has subsequently been modified through the current session and therefore
   * the state of this item as recorded in the session differs from the state
   * of this item as saved. Within a transaction, isModified on
   * an Item may return false (because the
   * Item has been saved since the modification) even if the
   * modification in question is not in persistent storage (because the
   * transaction has not yet been committed).
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is modified; false
   *         otherwise.
  */
  isModified(): boolean;
  /**
   * Returns true if this Item object (the Java
   * object instance) represents the same actual workspace item as the object
   * otherItem.
   * 
   * Two Item objects represent the same workspace item if and
   * only if all the following are true:  Both objects were acquired
   * through Session objects that were created by the same
   * Repository object. Both objects were acquired
   * through Session objects bound to the same repository
   * workspace. The objects are either both Node objects
   * or both Property objects. If they are
   * Node objects, they have the same identifier. If
   * they are Property objects they have identical names and
   * isSame is true of their parent nodes.  This method
   * does not compare the states of the two items. For example, if two
   * Item objects representing the same actual workspace item
   * have been retrieved through two different sessions and one has been
   * modified, then this method will still return true when
   * comparing these two objects. Note that if two Item objects
   * representing the same workspace item are retrieved through the
   * same session they will always reflect the same state.
   *
   * @param otherItem the Item object to be tested for identity
   *                  with this Item.
   * @return true if this Item object and
   *         otherItem represent the same actual repository item;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  isSame(otherItem: Item): boolean;
  /**
   * {@inheritDoc}
   * @return the JCRSessionWrapper through which this Item was
   *         acquired.
  */
  getSession(): JCRSessionWrapper;
  getCanonicalPath(): string;
}
/**
 * Interface for wrappers for javax.jcr.property to allow more data format.
 *
 * @author : toto
*/
export class JCRPropertyWrapper {
  /**
   * Returns the value of this  property as a Value object.
   * 
   * The object returned is a copy of the stored value and is immutable.
   *
   * @return the Value.
   * @throws ValueFormatException if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
  */
  getValue(): JCRValueWrapper;
  /**
   * Returns an array of all the values of this property. Used to access
   * multi-value properties. The array returned is a copy of the stored
   * values, so changes to it are not reflected in internal storage.
   *
   * @return a Value array.
   * @throws ValueFormatException if the property is single-valued.
   * @throws RepositoryException  if another error occurs.
  */
  getValues(): JCRValueWrapper[];
  /**
   * @return
   * @throws ValueFormatException
   * @throws RepositoryException in case of JCR-related errors
  */
  getRealValue(): JCRValueWrapper;
  /**
   * @return
   * @throws ValueFormatException
   * @throws RepositoryException in case of JCR-related errors
  */
  getRealValues(): JCRValueWrapper[];
  getContextualizedNode(): JCRNodeWrapper;
  getLocale(): string;
  /**
   * Gets the real Property wrapped by this JCRPropertyWrapper
   *
   * @return the real JCR Property
  */
  getRealProperty(): Property;
  /**
   * Returns a String representation of the value of this
   * property. A shortcut for Property.getValue().getString().
   *
   * @return A string representation of the value of this property.
   * @throws ValueFormatException if conversion to a String is
   *                              not possible or if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
   * @see Value
  */
  getString(): string;
  /**
   * Returns a Binary representation of the value of this
   * property. A shortcut for Property.getValue().getBinary().
   *
   * @return A Binary representation of the value of this
   *         property.
   * @throws ValueFormatException if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
   * @see Value
   * @see Binary
   * @since JCR 2.0
  */
  getBinary(): Binary;
  /**
   * Returns a long representation of the value of this property.
   * A shortcut for Property.getValue().getLong().
   *
   * @return A long representation of the value of this
   *         property.
   * @throws ValueFormatException if conversion to a long is not
   *                              possible or if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
   * @see Value
  */
  getLong(): number;
  /**
   * Returns a double representation of the value of this
   * property. A shortcut for Property.getValue().getDouble().
   *
   * @return A double representation of the value of this
   *         property.
   * @throws ValueFormatException if conversion to a double is
   *                              not possible or if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
   * @see Value
  */
  getDouble(): number;
  /**
   * Returns a boolean representation of the value of this
   * property. A shortcut for Property.getValue().getBoolean().
   *
   * @return A boolean representation of the value of this
   *         property.
   * @throws ValueFormatException if conversion to a boolean is
   *                              not possible or if the property is multi-valued.
   * @throws RepositoryException  if another error occurs.
   * @see Value
  */
  getBoolean(): boolean;
  /**
   * If this property is of type REFERENCE,
   * WEAKREFERENCE or PATH (or convertible to one of
   * these types) this method returns the Node to which this
   * property refers.
   * 
   * If this property is of type PATH and it contains a relative
   * path, it is interpreted relative to the parent node of this property. For
   * example "." refers to the parent node itself,
   * ".." to the parent of the parent node and "foo"
   * to a sibling node of this property.
   *
   * @return the referenced Node
   * @throws ValueFormatException  if this property cannot be converted to a
   *                               referring type (REFERENCE, WEAKREFERENCE or
   *                               PATH), if the property is multi-valued or if this property
   *                               is a referring type but is currently part of the frozen state of a
   *                               version in version storage.
   * @throws ItemNotFoundException If this property is of type
   *                               PATH or WEAKREFERENCE and no target node
   *                               accessible by the current Session exists in this workspace.
   *                               Note that this applies even if the property is a PATHS and a
   *                               property exists at the specified location. To dereference to a
   *                               target property (as opposed to a target node), the method
   *                               Property.getProperty is used.
   * @throws RepositoryException   if another error occurs.
  */
  getNode(): Node;
  /**
   * If this property is of type PATH (or convertible to this
   * type) this method returns the Property to which this
   * property refers.
   * 
   * If this property contains a relative path, it is interpreted relative to
   * the parent node of this property. Therefore, when resolving such a
   * relative path, the segment "." refers to
   * the parent node itself, ".." to the parent of the parent
   * node and "foo" to a sibling property of this property or
   * this property itself.
   * 
   * For example, if this property is located at
   * /a/b/c and it has a value of "../d" then this
   * method will return the property at /a/d if such exists.
   * 
   * If this property is multi-valued, this method throws a
   * ValueFormatException.
   * 
   * If this property cannot be converted to a PATH then a
   * ValueFormatException is thrown.
   * 
   * If this property is currently part of the frozen state of a version in
   * version storage, this method will throw a ValueFormatException.
   *
   * @return the referenced property
   * @throws ValueFormatException  if this property cannot be converted to a
   *                               PATH, if the property is multi-valued or if this property is
   *                               a referring type but is currently part of the frozen state of a version
   *                               in version storage.
   * @throws ItemNotFoundException If no property accessible by the current
   *                               Session exists in this workspace at the specified path. Note
   *                               that this applies even if a node exists at the specified location.
   *                               To dereference to a target node, the method Property.getNode
   *                               is used.
   * @throws RepositoryException   if another error occurs.
   * @since JCR 2.0
  */
  getProperty(): Property;
  /**
   * Returns the length of the value of this property.
   * 
   * For a BINARY property, getLength returns the
   * number of bytes. For other property types, getLength returns
   * the same value that would be returned by calling {@link
   * java.lang.String#length()} on the value when it has been converted to a
   * STRING according to standard JCR property type conversion.
   * 
   * Returns -1 if the implementation cannot determine the length.
   *
   * @return an long.
   * @throws ValueFormatException if this property is multi-valued.
   * @throws RepositoryException  if another error occurs.
  */
  getLength(): number;
  /**
   * Returns an array holding the lengths of the values of this (multi-value)
   * property in bytes where each is individually calculated as described in
   * {@link #getLength()}.
   * 
   * Returns a -1 in the appropriate position if the
   * implementation cannot determine the length of a value.
   *
   * @return an array of lengths
   * @throws ValueFormatException if this property is single-valued.
   * @throws RepositoryException  if another error occurs.
  */
  getLengths(): number[];
  /**
   * Returns the type of this Property. One of: 
   * PropertyType.STRING PropertyType.BINARY
   * PropertyType.DATE PropertyType.DOUBLE
   * PropertyType.LONG PropertyType.BOOLEAN
   * PropertyType.NAME PropertyType.PATH
   * PropertyType.REFERENCE PropertyType.WEAKREFERENCE
   * PropertyType.URI  The type returned is that
   * which was set at property creation. Note that for some property
   * p, the type returned by p.getType() will differ
   * from the type returned by p.getDefinition.getRequiredType()
   * only in the case where the latter returns UNDEFINED. The
   * type of a property instance is never UNDEFINED (it must
   * always have some actual type).
   *
   * @return an int
   * @throws RepositoryException if an error occurs
  */
  getType(): number;
  /**
   * Returns true if this property is multi-valued and
   * false if this property is single-valued.
   *
   * @return true if this property is multi-valued;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  isMultiple(): boolean;
  /**
   * Returns the normalized absolute path to this item.
   *
   * @return the normalized absolute path of this Item.
   * @throws RepositoryException if an error occurs.
  */
  getPath(): string;
  /**
   * Returns the name of this Item in qualified form. If this
   * Item is the root node of the workspace, an empty string is
   * returned.
   *
   * @return the name of this Item in qualified form or an empty
   *         string if this Item is the root node of a
   *         workspace.
   * @throws RepositoryException if an error occurs.
  */
  getName(): string;
  /**
   * Returns the ancestor of this Item at the specified depth. An
   * ancestor of depth x is the Item that is x
   * levels down along the path from the root node to this
   * Item.  depth = 0 returns the root node of a
   * workspace. depth = 1 returns the child of the root node along
   * the path to this Item. depth = 2 returns
   * the grandchild of the root node along the path to this
   * Item. And so on to depth = n, where
   * n is the depth of this Item, which returns
   * this Item itself. 
   * 
   * If this node has more than one path (i.e., if it is a descendant of a
   * shared node) then the path used to define the ancestor is
   * implementaion-dependent.
   *
   * @param depth An integer, 0 <= depth <= n where
   *              n is the depth of this Item.
   * @return The ancestor of this Item at the specified
   *         depth.
   * @throws ItemNotFoundException if depth < 0 or depth >
   *                               n where n is the is the depth of this item.
   * @throws AccessDeniedException if the current session does not have
   *                               sufficent access to retrieve the specified node.
   * @throws RepositoryException   if another error occurs.
  */
  getAncestor(depth: number): Item;
  /**
   * Returns the parent of this Item.
   *
   * @return The parent of this Item.
   * @throws ItemNotFoundException if this Item is the root node
   *                               of a workspace.
   * @throws AccessDeniedException if the current session does not have
   *                               sufficent access to retrieve the parent of this item.
   * @throws RepositoryException   if another error occurs.
  */
  getParent(): Node;
  /**
   * Returns the depth of this Item in the workspace item graph.
   *  The root node returns 0. A property or child node of the
   * root node returns 1. A property or child node of a child node of the
   * root returns 2. And so on to this Item. 
   *
   * @return The depth of this Item in the workspace item graph.
   * @throws RepositoryException if an error occurs.
  */
  getDepth(): number;
  /**
   * Indicates whether this Item is a Node or a
   * Property. Returns true if this
   * Item is a Node; Returns false if
   * this Item is a Property.
   *
   * @return true if this Item is a
   *         Node, false if it is a
   *         Property.
  */
  isNode(): boolean;
  /**
   * Returns true if this is a new item, meaning that it exists
   * only in transient storage on the Session and has not yet
   * been saved. Within a transaction, isNew on an
   * Item may return false (because the item has
   * been saved) even if that Item is not in persistent storage
   * (because the transaction has not yet been committed).
   * 
   * Note that if an item returns true on isNew,
   * then by definition is parent will return true on
   * isModified.
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is new; false
   *         otherwise.
  */
  isNew(): boolean;
  /**
   * Returns true if this Item has been saved but
   * has subsequently been modified through the current session and therefore
   * the state of this item as recorded in the session differs from the state
   * of this item as saved. Within a transaction, isModified on
   * an Item may return false (because the
   * Item has been saved since the modification) even if the
   * modification in question is not in persistent storage (because the
   * transaction has not yet been committed).
   * 
   * Note that in read-only implementations, this method will always return
   * false.
   *
   * @return true if this item is modified; false
   *         otherwise.
  */
  isModified(): boolean;
  /**
   * Returns true if this Item object (the Java
   * object instance) represents the same actual workspace item as the object
   * otherItem.
   * 
   * Two Item objects represent the same workspace item if and
   * only if all the following are true:  Both objects were acquired
   * through Session objects that were created by the same
   * Repository object. Both objects were acquired
   * through Session objects bound to the same repository
   * workspace. The objects are either both Node objects
   * or both Property objects. If they are
   * Node objects, they have the same identifier. If
   * they are Property objects they have identical names and
   * isSame is true of their parent nodes.  This method
   * does not compare the states of the two items. For example, if two
   * Item objects representing the same actual workspace item
   * have been retrieved through two different sessions and one has been
   * modified, then this method will still return true when
   * comparing these two objects. Note that if two Item objects
   * representing the same workspace item are retrieved through the
   * same session they will always reflect the same state.
   *
   * @param otherItem the Item object to be tested for identity
   *                  with this Item.
   * @return true if this Item object and
   *         otherItem represent the same actual repository item;
   *         false otherwise.
   * @throws RepositoryException if an error occurs.
  */
  isSame(otherItem: Item): boolean;
  /**
   * {@inheritDoc}
   * @return the JCRSessionWrapper through which this Item was
   *         acquired.
  */
  getSession(): JCRSessionWrapper;
  getCanonicalPath(): string;
}
/**
 * Jahia specific wrapper around javax.jcr.Session to be able to inject
 * Jahia specific actions and to manage sessions to multiple repository providers in
 * the backend.
 * 
 * Jahia services should use this wrapper rather than the original session interface to
 * ensure that we manipulate wrapped nodes and not the ones from the underlying
 * implementation.
 *
 * @author toto
*/
export class JCRSessionWrapper {
  getRootNode(): JCRNodeWrapper;
  getUserID(): string;
  getAttribute(s: string): any;
  getAttributeNames(): string[];
  getWorkspace(): JCRWorkspaceWrapper;
  getLocale(): Locale;
  getNodeByUUID(uuid: string): JCRNodeWrapper;
  getNodeByUUID(uuid: string, checkVersion: boolean): JCRNodeWrapper;
  getNodeByUUID(providerKey: string, uuid: string): JCRNodeWrapper;
  getItem(path: string): JCRItemWrapper;
  getItem(path: string, checkVersion: boolean): JCRItemWrapper;
  getNode(path: string): JCRNodeWrapper;
  getNode(path: string, checkVersion: boolean): JCRNodeWrapper;
  getUser(): JahiaUser;
  getNodeByIdentifier(id: string): JCRNodeWrapper;
  getProperty(absPath: string): Property;
  nodeExists(absPath: string): boolean;
  propertyExists(absPath: string): boolean;
  getFallbackLocale(): Locale;
  getIdentifier(): string;
}
/**
 * This is a wrapper for interface {@link javax.jcr.Value} to allow more types of properties.
 *
 * @author Cedric Mailleux
 * @since 6.1
*/
export class JCRValueWrapper {
  /**
   * Returns a Date representation of the Calendar's time of this value.
   * 
   * The object returned is a copy of the stored value, so changes to it are
   * not reflected in internal storage.
   *
   * @return A Date representation of this value.
   * @throws ValueFormatException if conversion to a Date is
   *                              not possible.
   * @throws RepositoryException  if another error occurs.
  */
  getTime(): Date;
  /**
   * Returns a JCRNodeWrapper instance referred by this value. The property has to be one of the following
   * types PropertyType.STRING PropertyType.REFERENCE
   * PropertyType.WEAKREFERENCE
   *
   * For other types a ValueFormatException is thrown. If the reference in the value cannot be resolved to an existing node,
   * the method returns null.
   *
   * @return A JCRNodeWrapper referred by the value of this
   *         property.
   * @throws ValueFormatException  if conversion to a JCRNodeWrapper is
   *                               not possible.
   * @throws IllegalStateException if getStream has previously
   *                               been called on this Value instance. In this case a new
   *                               Value instance must be acquired in order to successfully
   *                               call this method.
   * @throws RepositoryException   if another error occurs.
  */
  getNode(): JCRNodeWrapper;
  /**
   * Returns a String representation of this value.
   *
   * @return A String representation of the value of this
   *         property.
   * @throws ValueFormatException  if conversion to a String is
   *                               not possible.
   * @throws IllegalStateException if getStream has previously
   *                               been called on this Value instance. In this case a new
   *                               Value instance must be acquired in order to successfully
   *                               call this method.
   * @throws RepositoryException   if another error occurs.
  */
  getString(): string;
  /**
   * Returns a Binary representation of this value. The {@link
   * Binary} object in turn provides methods to access the binary data itself.
   * Uses the standard conversion to binary (see JCR specification).
   *
   * @return A Binary representation of this value.
   * @throws RepositoryException if an error occurs.
   * @since JCR 2.0
  */
  getBinary(): Binary;
  /**
   * Returns a long representation of this value.
   *
   * @return A long representation of this value.
   * @throws ValueFormatException if conversion to an long is not
   *                              possible.
   * @throws RepositoryException  if another error occurs.
  */
  getLong(): number;
  /**
   * Returns a double representation of this value.
   *
   * @return A double representation of this value.
   * @throws ValueFormatException if conversion to a double is
   *                              not possible.
   * @throws RepositoryException  if another error occurs.
  */
  getDouble(): number;
  /**
   * Returns a Boolean representation of this value.
   *
   * @return A Boolean representation of this value.
   * @throws ValueFormatException if conversion to a Boolean is
   *                              not possible.
   * @throws RepositoryException  if another error occurs.
  */
  getBoolean(): boolean;
  /**
   * Returns the type of this Value. One of: 
   * PropertyType.STRING PropertyType.DATE
   * PropertyType.BINARY PropertyType.DOUBLE
   * PropertyType.DECIMAL
   * PropertyType.LONG PropertyType.BOOLEAN
   * PropertyType.NAME PropertyType.PATH
   * PropertyType.REFERENCE PropertyType.WEAKREFERENCE
   * PropertyType.URI See {@link
   * PropertyType}.
   * 
   * The type returned is that which was set at property creation.
   *
   * @return an int
  */
  getType(): number;
}
/**
 * Jahia specific wrapper around javax.jcr.Workspace to be able to inject
 * Jahia specific actions and to manage workspaces on multiple repository providers in
 * the backend.
 *
 * Jahia services should use this wrapper rather than the original workspace interface to
 * ensure that we manipulate wrapped nodes and not the ones from the underlying
 * implementation.
 *
 * @author toto
*/
export class JCRWorkspaceWrapper {
  getSession(): JCRSessionWrapper;
  getName(): string;
  getQueryManager(): QueryManagerWrapper;
}
/**
 * Extension of the QueryManager interface, with wrapped return types
*/
export class QueryManagerWrapper {
  /**
   * Creates a new query by specifying the query statement itself
   * and the language in which the query is stated. The
   * language must be a string from among those returned by
   * QueryManager.getSupportedQueryLanguages().
   *
   * @param statement a String
   * @param language  a String
   * @return a Query object
   * @throws javax.jcr.query.InvalidQueryException if the query statement is syntactically
   *                               invalid or the specified language is not supported.
   * @throws javax.jcr.RepositoryException   if another error occurs.
  */
  createQuery(statement: string, language: string): QueryWrapper;
}

}
