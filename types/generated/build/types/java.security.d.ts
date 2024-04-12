declare module 'java.security' {
/**
 * This interface represents the abstract notion of a principal, which
 * can be used to represent any entity, such as an individual, a
 * corporation, and a login id.
 *
 * @see java.security.cert.X509Certificate
 *
 * @author Li Gong
 * @since 1.1
*/
export class Principal {
  /**
   * Returns a string representation of this principal.
   *
   * @return a string representation of this principal.
  */
  toString(): string;
  /**
   * Returns the name of this principal.
   *
   * @return the name of this principal.
  */
  getName(): string;
}

}
