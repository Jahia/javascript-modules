declare module 'java.net' {
/**
 * Class `URL` represents a Uniform Resource
 * Locator, a pointer to a "resource" on the World
 * Wide Web. A resource can be something as simple as a file or a
 * directory, or it can be a reference to a more complicated object,
 * such as a query to a database or to a search engine. More
 * information on the types of URLs and their formats can be found at:
 * 
 * Types of URL
 * 
 * In general, a URL can be broken into several parts. Consider the
 * following example:
 *  *     http://www.example.com/docs/resource1.html
 * 
 * 
 * The URL above indicates that the protocol to use is
 * `http` (HyperText Transfer Protocol) and that the
 * information resides on a host machine named
 * `www.example.com`. The information on that host
 * machine is named `/docs/resource1.html`. The exact
 * meaning of this name on the host machine is both protocol
 * dependent and host dependent. The information normally resides in
 * a file, but it could be generated on the fly. This component of
 * the URL is called the path component.
 * 
 * A URL can optionally specify a "port", which is the
 * port number to which the TCP connection is made on the remote host
 * machine. If the port is not specified, the default port for
 * the protocol is used instead. For example, the default port for
 * `http` is `80`. An alternative port could be
 * specified as:
 *  *     http://www.example.com:1080/docs/resource1.html
 * 
 * 
 * The syntax of `URL` is defined by  RFC 2396: Uniform
 * Resource Identifiers (URI): Generic Syntax, amended by RFC 2732: Format for
 * Literal IPv6 Addresses in URLs. The Literal IPv6 address format
 * also supports scope_ids. The syntax and usage of scope_ids is described
 * here.
 * 
 * A URL may have appended to it a "fragment", also known
 * as a "ref" or a "reference". The fragment is indicated by the sharp
 * sign character "#" followed by more characters. For example,
 *  *     http://java.sun.com/index.html#chapter1
 * 
 * 
 * This fragment is not technically part of the URL. Rather, it
 * indicates that after the specified resource is retrieved, the
 * application is specifically interested in that part of the
 * document that has the tag `chapter1` attached to it. The
 * meaning of a tag is resource specific.
 * 
 * An application can also specify a "relative URL",
 * which contains only enough information to reach the resource
 * relative to another URL. Relative URLs are frequently used within
 * HTML pages. For example, if the contents of the URL:
 *  *     http://java.sun.com/index.html
 * 
 * contained within it the relative URL:
 *  *     FAQ.html
 * 
 * it would be a shorthand for:
 *  *     http://java.sun.com/FAQ.html
 * 
 * 
 * The relative URL need not specify all the components of a URL. If
 * the protocol, host name, or port number is missing, the value is
 * inherited from the fully specified URL. The file component must be
 * specified. The optional fragment is not inherited.
 * 
 * The URL class does not itself encode or decode any URL components
 * according to the escaping mechanism defined in RFC2396. It is the
 * responsibility of the caller to encode any fields, which need to be
 * escaped prior to calling URL, and also to decode any escaped fields,
 * that are returned from URL. Furthermore, because URL has no knowledge
 * of URL escaping, it does not recognise equivalence between the encoded
 * or decoded form of the same URL. For example, the two URLs:
 *     http://foo.com/hello world/ and http://foo.com/hello%20world
 * would be considered not equal to each other.
 * 
 * Note, the {@link java.net.URI} class does perform escaping of its
 * component fields in certain circumstances. The recommended way
 * to manage the encoding and decoding of URLs is to use {@link java.net.URI},
 * and to convert between these two classes using {@link #toURI()} and
 * {@link URI#toURL()}.
 * 
 * The {@link URLEncoder} and {@link URLDecoder} classes can also be
 * used, but only for HTML form encoding, which is not the same
 * as the encoding scheme defined in RFC2396.
 *
 * @author  James Gosling
 * @since 1.0
*/
export class URL {
  /**
   * Gets the query part of this `URL`.
   *
   * @return  the query part of this `URL`,
   * or null if one does not exist
   * @since 1.3
  */
  getQuery(): string;
  /**
   * Gets the path part of this `URL`.
   *
   * @return  the path part of this `URL`, or an
   * empty string if one does not exist
   * @since 1.3
  */
  getPath(): string;
  /**
   * Gets the userInfo part of this `URL`.
   *
   * @return  the userInfo part of this `URL`, or
   * null if one does not exist
   * @since 1.3
  */
  getUserInfo(): string;
  /**
   * Gets the authority part of this `URL`.
   *
   * @return  the authority part of this `URL`
   * @since 1.3
  */
  getAuthority(): string;
  /**
   * Gets the port number of this `URL`.
   *
   * @return  the port number, or -1 if the port is not set
  */
  getPort(): number;
  /**
   * Gets the default port number of the protocol associated
   * with this `URL`. If the URL scheme or the URLStreamHandler
   * for the URL do not define a default port number,
   * then -1 is returned.
   *
   * @return  the port number
   * @since 1.4
  */
  getDefaultPort(): number;
  /**
   * Gets the protocol name of this `URL`.
   *
   * @return  the protocol of this `URL`.
  */
  getProtocol(): string;
  /**
   * Gets the host name of this `URL`, if applicable.
   * The format of the host conforms to RFC 2732, i.e. for a
   * literal IPv6 address, this method will return the IPv6 address
   * enclosed in square brackets (`'['` and `']'`).
   *
   * @return  the host name of this `URL`.
  */
  getHost(): string;
  /**
   * Gets the file name of this `URL`.
   * The returned file portion will be
   * the same as getPath(), plus the concatenation of
   * the value of getQuery(), if any. If there is
   * no query portion, this method and getPath() will
   * return identical results.
   *
   * @return  the file name of this `URL`,
   * or an empty string if one does not exist
  */
  getFile(): string;
  /**
   * Gets the anchor (also known as the "reference") of this
   * `URL`.
   *
   * @return  the anchor (also known as the "reference") of this
   *          `URL`, or null if one does not exist
  */
  getRef(): string;
  /**
   * Gets the contents of this URL. This method is a shorthand for:
   *      *     openConnection().getContent()
   * 
   *
   * @return     the contents of this URL.
   * @exception  IOException  if an I/O exception occurs.
   * @see        java.net.URLConnection#getContent()
  */
  getContent(): any;
}

}
