declare module 'org.jahia.services.usermanager' {
/**
 * A JahiaUser represents a physical person who is defined by a username and
 * a password for authentication purpose. Every other property of a JahiaUser
 * is stored in it's properties list, which hold key-value string pairs. For
 * example email, firstname, lastname, ... information should be stored in this
 * properties list.
 *
 * @author Fulco Houkes
 * @author Khue Nguyen
*/
export class JahiaUser {
  /**
   * Return the user username.
   *
   * @return Return the username.
  */
  getUsername(): string;
  /**
   * Return the unique String identifier of this user.
   *
   * @return the unique String identifier of this user.
  */
  getUserKey(): string;
  /**
   * Retrieve the requested user property.
   *
   * @param key Property's name.
   * @return Return the property's value of the specified key, or null if the
   *         property does not exist.
  */
  getProperty(key: string): string;
  /**
   * Test if the user is member of the specified group.
   *
   * @param name   Groupname.
   * @param siteID the site id
   * @return Return true if the user is member of the specified group, or
   *         false on any error.
   * @deprecated
  */
  isMemberOfGroup(siteID: number, name: string): boolean;
  /**
   * Test if the user is an admin member
   *
   * @param siteID the site id
   * @return Return true if the user is an admin member
   *         false on any error.
   * @deprecated
  */
  isAdminMember(siteID: number): boolean;
  /**
   * Test if the user is the root user
   *
   * @return Return true if the user is the root user
   *         false on any error.
  */
  isRoot(): boolean;
  /**
   * Get the name of the provider of this user.
   *
   * @return String representation of the name of the provider of this user
  */
  getProviderName(): string;
  /**
   * Get the path of this user in the local store. For examle for LDAP user this will return the path of
   * the user in the JCR with all necessary encoding.
   *
   * @return String representation of the name of the provider of this user
  */
  getLocalPath(): string;
  /**
   * Checks if the account is locked
   *
   * @return true if the account is locked
  */
  isAccountLocked(): boolean;
  /**
   * Get the realm name this user belongs to.
   * @return
  */
  getRealm(): string;
}

}
