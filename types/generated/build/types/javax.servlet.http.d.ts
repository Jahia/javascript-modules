declare module 'javax.servlet.http' {
import { Principal } from 'java.security';
import { ServletInputStream, ServletOutputStream } from 'javax.servlet';
import { Locale, Enumeration, Collection, Map } from 'java.util';
import { BufferedReader, PrintWriter } from 'java.io';
/**
 *
 * Creates a cookie, a small amount of information sent by a servlet to 
 * a Web browser, saved by the browser, and later sent back to the server.
 * A cookie's value can uniquely 
 * identify a client, so cookies are commonly used for session management.
 * 
 * A cookie has a name, a single value, and optional attributes
 * such as a comment, path and domain qualifiers, a maximum age, and a
 * version number. Some Web browsers have bugs in how they handle the 
 * optional attributes, so use them sparingly to improve the interoperability 
 * of your servlets.
 *
 * The servlet sends cookies to the browser by using the
 * {@link HttpServletResponse#addCookie} method, which adds
 * fields to HTTP response headers to send cookies to the 
 * browser, one at a time. The browser is expected to 
 * support 20 cookies for each Web server, 300 cookies total, and
 * may limit cookie size to 4 KB each.
 * 
 * The browser returns cookies to the servlet by adding 
 * fields to HTTP request headers. Cookies can be retrieved
 * from a request by using the {@link HttpServletRequest#getCookies} method.
 * Several cookies might have the same name but different path attributes.
 * 
 * Cookies affect the caching of the Web pages that use them. 
 * HTTP 1.0 does not cache pages that use cookies created with
 * this class. This class does not support the cache control
 * defined with HTTP 1.1.
 *
 * This class supports both the Version 0 (by Netscape) and Version 1 
 * (by RFC 2109) cookie specifications. By default, cookies are
 * created using Version 0 to ensure the best interoperability.
 *
 * @author	Various
*/
export class Cookie {
  /**
   * Returns the comment describing the purpose of this cookie, or
   * null if the cookie has no comment.
   *
   * @return the comment of the cookie, or null if unspecified
   *
   * @see #setComment
  */
  getComment(): string;
  /**
   * Gets the domain name of this Cookie.
   *
   * Domain names are formatted according to RFC 2109.
   *
   * @return the domain name of this Cookie
   *
   * @see #setDomain
  */
  getDomain(): string;
  /**
   * Gets the maximum age in seconds of this Cookie.
   *
   * By default, -1 is returned, which indicates that
   * the cookie will persist until browser shutdown.
   *
   * @return			an integer specifying the maximum age of the
   *				cookie in seconds; if negative, means
   *				the cookie persists until browser shutdown
   *
   * @see #setMaxAge
  */
  getMaxAge(): number;
  /**
   * Returns the path on the server 
   * to which the browser returns this cookie. The
   * cookie is visible to all subpaths on the server.
   *
   * @return		a String specifying a path that contains
   *			a servlet name, for example, /catalog
   *
   * @see #setPath
  */
  getPath(): string;
  /**
   * Returns true if the browser is sending cookies
   * only over a secure protocol, or false if the
   * browser can send cookies using any protocol.
   *
   * @return true if the browser uses a secure protocol,
   * false otherwise
   *
   * @see #setSecure
  */
  getSecure(): boolean;
  /**
   * Returns the name of the cookie. The name cannot be changed after
   * creation.
   *
   * @return the name of the cookie
  */
  getName(): string;
  /**
   * Gets the current value of this Cookie.
   *
   * @return the current value of this Cookie
   *
   * @see #setValue
  */
  getValue(): string;
  /**
   * Returns the version of the protocol this cookie complies 
   * with. Version 1 complies with RFC 2109, 
   * and version 0 complies with the original
   * cookie specification drafted by Netscape. Cookies provided
   * by a browser use and identify the browser's cookie version.
   * 
   * @return			0 if the cookie complies with the
   *				original Netscape specification; 1
   *				if the cookie complies with RFC 2109
   *
   * @see #setVersion
  */
  getVersion(): number;
  /**
   * Checks whether this Cookie has been marked as HttpOnly.
   *
   * @return true if this Cookie has been marked as HttpOnly,
   * false otherwise
   *
   * @since Servlet 3.0
  */
  isHttpOnly(): boolean;
}
export class HttpServletRequest {
  /**
   * Returns the name of the authentication scheme used to protect
   * the servlet. All servlet containers support basic, form and client 
   * certificate authentication, and may additionally support digest 
   * authentication.
   * If the servlet is not authenticated null is returned. 
   *
   * Same as the value of the CGI variable AUTH_TYPE.
   *
   * @return		one of the static members BASIC_AUTH, 
   *			FORM_AUTH, CLIENT_CERT_AUTH, DIGEST_AUTH
   *			(suitable for == comparison) or
   *			the container-specific string indicating
   *			the authentication scheme, or
   *			null if the request was 
   *			not authenticated.     
  */
  getAuthType(): string;
  /**
   * Returns an array containing all of the Cookie
   * objects the client sent with this request.
   * This method returns null if no cookies were sent.
   *
   * @return		an array of all the Cookies
   *			included with this request, or null
   *			if the request has no cookies
  */
  getCookies(): Cookie[];
  /**
   * Returns the value of the specified request header
   * as a long value that represents a 
   * Date object. Use this method with
   * headers that contain dates, such as
   * If-Modified-Since. 
   *
   * The date is returned as
   * the number of milliseconds since January 1, 1970 GMT.
   * The header name is case insensitive.
   *
   * If the request did not have a header of the
   * specified name, this method returns -1. If the header
   * can't be converted to a date, the method throws
   * an IllegalArgumentException.
   *
   * @param name		a String specifying the
   *				name of the header
   *
   * @return			a long value
   *				representing the date specified
   *				in the header expressed as
   *				the number of milliseconds
   *				since January 1, 1970 GMT,
   *				or -1 if the named header
   *				was not included with the
   *				request
   *
   * @exception	IllegalArgumentException	If the header value
   *							can't be converted
   *							to a date
  */
  getDateHeader(name: string): number;
  /**
   * Returns the value of the specified request header
   * as a String. If the request did not include a header
   * of the specified name, this method returns null.
   * If there are multiple headers with the same name, this method
   * returns the first head in the request.
   * The header name is case insensitive. You can use
   * this method with any request header.
   *
   * @param name		a String specifying the
   *				header name
   *
   * @return			a String containing the
   *				value of the requested
   *				header, or null
   *				if the request does not
   *				have a header of that name
  */
  getHeader(name: string): string;
  /**
   * Returns all the values of the specified request header
   * as an Enumeration of String objects.
   *
   * Some headers, such as Accept-Language can be sent
   * by clients as several headers each with a different value rather than
   * sending the header as a comma separated list.
   *
   * If the request did not include any headers
   * of the specified name, this method returns an empty
   * Enumeration.
   * The header name is case insensitive. You can use
   * this method with any request header.
   *
   * @param name		a String specifying the
   *				header name
   *
   * @return			an Enumeration containing
   *                  	the values of the requested header. If
   *                  	the request does not have any headers of
   *                  	that name return an empty
   *                  	enumeration. If 
   *                  	the container does not allow access to
   *                  	header information, return null
  */
  getHeaders(name: string): Enumeration<string>;
  /**
   * Returns an enumeration of all the header names
   * this request contains. If the request has no
   * headers, this method returns an empty enumeration.
   *
   * Some servlet containers do not allow
   * servlets to access headers using this method, in
   * which case this method returns null
   *
   * @return			an enumeration of all the
   *				header names sent with this
   *				request; if the request has
   *				no headers, an empty enumeration;
   *				if the servlet container does not
   *				allow servlets to use this method,
   *				null
  */
  getHeaderNames(): Enumeration<string>;
  /**
   * Returns the value of the specified request header
   * as an int. If the request does not have a header
   * of the specified name, this method returns -1. If the
   * header cannot be converted to an integer, this method
   * throws a NumberFormatException.
   *
   * The header name is case insensitive.
   *
   * @param name		a String specifying the name
   *				of a request header
   *
   * @return			an integer expressing the value 
   * 				of the request header or -1
   *				if the request doesn't have a
   *				header of this name
   *
   * @exception	NumberFormatException		If the header value
   *							can't be converted
   *							to an int
  */
  getIntHeader(name: string): number;
  /**
   * Returns the name of the HTTP method with which this 
   * request was made, for example, GET, POST, or PUT.
   * Same as the value of the CGI variable REQUEST_METHOD.
   *
   * @return			a String 
   *				specifying the name
   *				of the method with which
   *				this request was made
  */
  getMethod(): string;
  /**
   * Returns any extra path information associated with
   * the URL the client sent when it made this request.
   * The extra path information follows the servlet path
   * but precedes the query string and will start with
   * a "/" character.
   *
   * This method returns null if there
   * was no extra path information.
   *
   * Same as the value of the CGI variable PATH_INFO.
   *
   * @return		a String, decoded by the
   *			web container, specifying 
   *			extra path information that comes
   *			after the servlet path but before
   *			the query string in the request URL;
   *			or null if the URL does not have
   *			any extra path information
  */
  getPathInfo(): string;
  /**
   * Returns any extra path information after the servlet name
   * but before the query string, and translates it to a real
   * path. Same as the value of the CGI variable PATH_TRANSLATED.
   *
   * If the URL does not have any extra path information,
   * this method returns null or the servlet container
   * cannot translate the virtual path to a real path for any reason
   * (such as when the web application is executed from an archive).
   *
   * The web container does not decode this string.
   *
   * @return		a String specifying the
   *			real path, or null if
   *			the URL does not have any extra path
   *			information
  */
  getPathTranslated(): string;
  /**
   * Returns the portion of the request URI that indicates the context
   * of the request. The context path always comes first in a request
   * URI. The path starts with a "/" character but does not end with a "/"
   * character. For servlets in the default (root) context, this method
   * returns "". The container does not decode this string.
   *
   * It is possible that a servlet container may match a context by
   * more than one context path. In such cases this method will return the
   * actual context path used by the request and it may differ from the
   * path returned by the
   * {@link javax.servlet.ServletContext#getContextPath()} method.
   * The context path returned by
   * {@link javax.servlet.ServletContext#getContextPath()}
   * should be considered as the prime or preferred context path of the
   * application.
   *
   * @return		a String specifying the
   *			portion of the request URI that indicates the context
   *			of the request
   *
   * @see javax.servlet.ServletContext#getContextPath()
  */
  getContextPath(): string;
  /**
   * Returns the query string that is contained in the request
   * URL after the path. This method returns null
   * if the URL does not have a query string. Same as the value
   * of the CGI variable QUERY_STRING. 
   *
   * @return		a String containing the query
   *			string or null if the URL 
   *			contains no query string. The value is not
   *			decoded by the container.
  */
  getQueryString(): string;
  /**
   * Returns the login of the user making this request, if the
   * user has been authenticated, or null if the user 
   * has not been authenticated.
   * Whether the user name is sent with each subsequent request
   * depends on the browser and type of authentication. Same as the 
   * value of the CGI variable REMOTE_USER.
   *
   * @return		a String specifying the login
   *			of the user making this request, or null
   *			if the user login is not known
  */
  getRemoteUser(): string;
  /**
   * Returns a boolean indicating whether the authenticated user is included
   * in the specified logical "role".  Roles and role membership can be
   * defined using deployment descriptors.  If the user has not been
   * authenticated, the method returns false.
   *
   * The role name “*” should never be used as an argument in calling
   * isUserInRole. Any call to isUserInRole with
   * “*” must return false.
   * If the role-name of the security-role to be tested is “**”, and
   * the application has NOT declared an application security-role with
   * role-name “**”, isUserInRole must only return true if
   * the user has been authenticated; that is, only when
   * {@link #getRemoteUser} and {@link #getUserPrincipal} would both return
   * a non-null value. Otherwise, the container must check
   * the user for membership in the application role.
   *
   * @param role		a String specifying the name
   *				of the role
   *
   * @return		a boolean indicating whether
   *			the user making this request belongs to a given role;
   *			false if the user has not been 
   *			authenticated
  */
  isUserInRole(role: string): boolean;
  /**
   * Returns a java.security.Principal object containing
   * the name of the current authenticated user. If the user has not been
   * authenticated, the method returns null.
   *
   * @return		a java.security.Principal containing
   *			the name of the user making this request;
   *			null if the user has not been 
   *			authenticated
  */
  getUserPrincipal(): Principal;
  /**
   * Returns the session ID specified by the client. This may
   * not be the same as the ID of the current valid session
   * for this request.
   * If the client did not specify a session ID, this method returns
   * null.
   *
   * @return		a String specifying the session
   *			ID, or null if the request did
   *			not specify a session ID
   *
   * @see     #isRequestedSessionIdValid
  */
  getRequestedSessionId(): string;
  /**
   * Returns the part of this request's URL from the protocol
   * name up to the query string in the first line of the HTTP request.
   * The web container does not decode this String.
   * For example:
   * 
   * 
   * First line of HTTP request      
   *      Returned Value
   * POST /some/path.html HTTP/1.1/some/path.html
   * GET http://foo.bar/a.html HTTP/1.0
   * /a.html
   * HEAD /xyz?a=b HTTP/1.1/xyz
   * 
   *
   * To reconstruct an URL with a scheme and host, use
   * {@link HttpUtils#getRequestURL}.
   *
   * @return		a String containing
   *			the part of the URL from the 
   *			protocol name up to the query string
   *
   * @see     HttpUtils#getRequestURL
  */
  getRequestURI(): string;
  /**
   * Returns the part of this request's URL that calls
   * the servlet. This path starts with a "/" character
   * and includes either the servlet name or a path to
   * the servlet, but does not include any extra path
   * information or a query string. Same as the value of
   * the CGI variable SCRIPT_NAME.
   *
   * This method will return an empty string ("") if the
   * servlet used to process this request was matched using
   * the "/*" pattern.
   *
   * @return		a String containing
   *			the name or path of the servlet being
   *			called, as specified in the request URL,
   *			decoded, or an empty string if the servlet
   *			used to process the request is matched
   *			using the "/*" pattern.
  */
  getServletPath(): string;
  /**
   * Returns the current HttpSession
   * associated with this request or, if there is no
   * current session and create is true, returns 
   * a new session.
   *
   * If create is false
   * and the request has no valid HttpSession,
   * this method returns null.
   *
   * To make sure the session is properly maintained,
   * you must call this method before 
   * the response is committed. If the container is using cookies
   * to maintain session integrity and is asked to create a new session
   * when the response is committed, an IllegalStateException is thrown.
   *
   * @param create	true to create
   *			a new session for this request if necessary; 
   *			false to return null
   *			if there's no current session
   *
   * @return 		the HttpSession associated 
   *			with this request or null if
   * 			create is false
   *			and the request has no valid session
   *
   * @see #getSession()
  */
  getSession(create: boolean): HttpSession;
  /**
   * Returns the current session associated with this request,
   * or if the request does not have a session, creates one.
   * 
   * @return		the HttpSession associated
   *			with this request
   *
   * @see	#getSession(boolean)
  */
  getSession(): HttpSession;
  /**
   * Checks whether the requested session ID is still valid.
   *
   * If the client did not specify any session ID, this method returns
   * false.     
   *
   * @return			true if this
   *				request has an id for a valid session
   *				in the current session context;
   *				false otherwise
   *
   * @see			#getRequestedSessionId
   * @see			#getSession
   * @see			HttpSessionContext
  */
  isRequestedSessionIdValid(): boolean;
  /**
   * Checks whether the requested session ID came in as a cookie.
   *
   * @return			true if the session ID
   *				came in as a
   *				cookie; otherwise, false
   *
   * @see         #getSession
  */
  isRequestedSessionIdFromCookie(): boolean;
  /**
   * Checks whether the requested session ID came in as part of the 
   * request URL.
   *
   * @return			true if the session ID
   *				came in as part of a URL; otherwise,
   *				false
   *
   * @see         #getSession
  */
  isRequestedSessionIdFromURL(): boolean;
  /**
   * @deprecated		As of Version 2.1 of the Java Servlet
   *				API, use {@link #isRequestedSessionIdFromURL}
   *				instead.
  */
  isRequestedSessionIdFromUrl(): boolean;
  /**
   * Gets all the {@link Part} components of this request, provided
   * that it is of type multipart/form-data.
   *
   * If this request is of type multipart/form-data, but
   * does not contain any Part components, the returned
   * Collection will be empty.
   *
   * Any changes to the returned Collection must not 
   * affect this HttpServletRequest.
   *
   * @return a (possibly empty) Collection of the
   * Part components of this request
   *
   * @throws IOException if an I/O error occurred during the retrieval
   * of the {@link Part} components of this request
   *
   * @throws ServletException if this request is not of type
   * multipart/form-data
   *
   * @throws IllegalStateException if the request body is larger than
   * maxRequestSize, or any Part in the
   * request is larger than maxFileSize, or there is no
   * @MultipartConfig or multipart-config in
   * deployment descriptors
   *
   * @see javax.servlet.annotation.MultipartConfig#maxFileSize
   * @see javax.servlet.annotation.MultipartConfig#maxRequestSize
   *
   * @since Servlet 3.0
  */
  getParts(): Collection<Part>;
  /**
   * Gets the {@link Part} with the given name.
   *
   * @param name the name of the requested Part
   *
   * @return The Part with the given name, or
   * null if this request is of type
   * multipart/form-data, but does not
   * contain the requested Part
   *
   * @throws IOException if an I/O error occurred during the retrieval
   * of the requested Part
   * @throws ServletException if this request is not of type
   * multipart/form-data
   * @throws IllegalStateException if the request body is larger than
   * maxRequestSize, or any Part in the
   * request is larger than maxFileSize, or there is no
   * @MultipartConfig or multipart-config in
   * deployment descriptors
   *
   * @see javax.servlet.annotation.MultipartConfig#maxFileSize
   * @see javax.servlet.annotation.MultipartConfig#maxRequestSize
   *
   * @since Servlet 3.0
  */
  getPart(name: string): Part;
  /**
   * Returns the value of the named attribute as an Object,
   * or null if no attribute of the given name exists. 
   *
   *  Attributes can be set two ways.  The servlet container may set
   * attributes to make available custom information about a request.
   * For example, for requests made using HTTPS, the attribute
   * javax.servlet.request.X509Certificate can be used to
   * retrieve information on the certificate of the client.  Attributes
   * can also be set programatically using 
   * {@link ServletRequest#setAttribute}.  This allows information to be
   * embedded into a request before a {@link RequestDispatcher} call.
   *
   * Attribute names should follow the same conventions as package
   * names. This specification reserves names matching java.*,
   * javax.*, and sun.*. 
   *
   * @param name a String specifying the name of the attribute
   *
   * @return an Object containing the value of the attribute,
   * or null if the attribute does not exist
  */
  getAttribute(name: string): any;
  /**
   * Returns an Enumeration containing the
   * names of the attributes available to this request. 
   * This method returns an empty Enumeration
   * if the request has no attributes available to it.
   * 
   * @return an Enumeration of strings containing the names 
   * of the request's attributes
  */
  getAttributeNames(): Enumeration<string>;
  /**
   * Returns the name of the character encoding used in the body of this
   * request. This method returns null if the request
   * does not specify a character encoding
   * 
   * @return a String containing the name of the character
   * encoding, or null if the request does not specify a
   * character encoding
  */
  getCharacterEncoding(): string;
  /**
   * Returns the length, in bytes, of the request body and made available by
   * the input stream, or -1 if the length is not known ir is greater than
   * Integer.MAX_VALUE. For HTTP servlets,
   * same as the value of the CGI variable CONTENT_LENGTH.
   *
   * @return an integer containing the length of the request body or -1 if
   * the length is not known or is greater than Integer.MAX_VALUE.
  */
  getContentLength(): number;
  /**
   * Returns the length, in bytes, of the request body and made available by
   * the input stream, or -1 if the length is not known. For HTTP servlets,
   * same as the value of the CGI variable CONTENT_LENGTH.
   *
   * @return a long containing the length of the request body or -1L if
   * the length is not known
   *
   * @since Servlet 3.1
  */
  getContentLengthLong(): number;
  /**
   * Returns the MIME type of the body of the request, or 
   * null if the type is not known. For HTTP servlets, 
   * same as the value of the CGI variable CONTENT_TYPE.
   *
   * @return a String containing the name of the MIME type
   * of the request, or null if the type is not known
  */
  getContentType(): string;
  /**
   * Retrieves the body of the request as binary data using
   * a {@link ServletInputStream}.  Either this method or 
   * {@link #getReader} may be called to read the body, not both.
   *
   * @return a {@link ServletInputStream} object containing
   * the body of the request
   *
   * @exception IllegalStateException if the {@link #getReader} method
   * has already been called for this request
   *
   * @exception IOException if an input or output exception occurred
  */
  getInputStream(): ServletInputStream;
  /**
   * Returns the value of a request parameter as a String,
   * or null if the parameter does not exist. Request parameters
   * are extra information sent with the request.  For HTTP servlets,
   * parameters are contained in the query string or posted form data.
   *
   * You should only use this method when you are sure the
   * parameter has only one value. If the parameter might have
   * more than one value, use {@link #getParameterValues}.
   *
   * If you use this method with a multivalued
   * parameter, the value returned is equal to the first value
   * in the array returned by getParameterValues.
   *
   * If the parameter data was sent in the request body, such as occurs
   * with an HTTP POST request, then reading the body directly via {@link
   * #getInputStream} or {@link #getReader} can interfere
   * with the execution of this method.
   *
   * @param name a String specifying the name of the parameter
   *
   * @return a String representing the single value of
   * the parameter
   *
   * @see #getParameterValues
  */
  getParameter(name: string): string;
  /**
   *
   * Returns an Enumeration of String
   * objects containing the names of the parameters contained
   * in this request. If the request has 
   * no parameters, the method returns an empty Enumeration. 
   *
   * @return an Enumeration of String
   * objects, each String containing the name of
   * a request parameter; or an empty Enumeration
   * if the request has no parameters
  */
  getParameterNames(): Enumeration<string>;
  /**
   * Returns an array of String objects containing 
   * all of the values the given request parameter has, or 
   * null if the parameter does not exist.
   *
   * If the parameter has a single value, the array has a length
   * of 1.
   *
   * @param name a String containing the name of 
   * the parameter whose value is requested
   *
   * @return an array of String objects 
   * containing the parameter's values
   *
   * @see #getParameter
  */
  getParameterValues(name: string): string[];
  /**
   * Returns a java.util.Map of the parameters of this request.
   * 
   * Request parameters are extra information sent with the request.
   * For HTTP servlets, parameters are contained in the query string or
   * posted form data.
   *
   * @return an immutable java.util.Map containing parameter names as 
   * keys and parameter values as map values. The keys in the parameter
   * map are of type String. The values in the parameter map are of type
   * String array.
  */
  getParameterMap(): Map<string, string[]>;
  /**
   * Returns the name and version of the protocol the request uses
   * in the form protocol/majorVersion.minorVersion, for 
   * example, HTTP/1.1. For HTTP servlets, the value
   * returned is the same as the value of the CGI variable 
   * SERVER_PROTOCOL.
   *
   * @return a String containing the protocol 
   * name and version number
  */
  getProtocol(): string;
  /**
   * Returns the name of the scheme used to make this request, 
   * for example,
   * http, https, or ftp.
   * Different schemes have different rules for constructing URLs,
   * as noted in RFC 1738.
   *
   * @return a String containing the name 
   * of the scheme used to make this request
  */
  getScheme(): string;
  /**
   * Returns the host name of the server to which the request was sent.
   * It is the value of the part before ":" in the Host
   * header value, if any, or the resolved server name, or the server IP
   * address.
   *
   * @return a String containing the name of the server
  */
  getServerName(): string;
  /**
   * Returns the port number to which the request was sent.
   * It is the value of the part after ":" in the Host
   * header value, if any, or the server port where the client connection
   * was accepted on.
   *
   * @return an integer specifying the port number
  */
  getServerPort(): number;
  /**
   * Retrieves the body of the request as character data using
   * a BufferedReader.  The reader translates the character
   * data according to the character encoding used on the body.
   * Either this method or {@link #getInputStream} may be called to read the
   * body, not both.
   * 
   * @return a BufferedReader containing the body of the request 
   *
   * @exception UnsupportedEncodingException  if the character set encoding
   * used is not supported and the text cannot be decoded
   *
   * @exception IllegalStateException if {@link #getInputStream} method
   * has been called on this request
   *
   * @exception IOException if an input or output exception occurred
   *
   * @see #getInputStream
  */
  getReader(): BufferedReader;
  /**
   * Returns the Internet Protocol (IP) address of the client 
   * or last proxy that sent the request.
   * For HTTP servlets, same as the value of the 
   * CGI variable REMOTE_ADDR.
   *
   * @return a String containing the 
   * IP address of the client that sent the request
  */
  getRemoteAddr(): string;
  /**
   * Returns the fully qualified name of the client
   * or the last proxy that sent the request.
   * If the engine cannot or chooses not to resolve the hostname 
   * (to improve performance), this method returns the dotted-string form of 
   * the IP address. For HTTP servlets, same as the value of the CGI variable 
   * REMOTE_HOST.
   *
   * @return a String containing the fully 
   * qualified name of the client
  */
  getRemoteHost(): string;
  /**
   * Returns the preferred Locale that the client will 
   * accept content in, based on the Accept-Language header.
   * If the client request doesn't provide an Accept-Language header,
   * this method returns the default locale for the server.
   *
   * @return the preferred Locale for the client
  */
  getLocale(): Locale;
  /**
   * Returns an Enumeration of Locale objects
   * indicating, in decreasing order starting with the preferred locale, the
   * locales that are acceptable to the client based on the Accept-Language
   * header.
   * If the client request doesn't provide an Accept-Language header,
   * this method returns an Enumeration containing one 
   * Locale, the default locale for the server.
   *
   * @return an Enumeration of preferred 
   * Locale objects for the client
  */
  getLocales(): Enumeration<Locale>;
  /**
   *
   * Returns a boolean indicating whether this request was made using a
   * secure channel, such as HTTPS.
   *
   * @return a boolean indicating if the request was made using a
   * secure channel
  */
  isSecure(): boolean;
  /**
   * @deprecated  As of Version 2.1 of the Java Servlet API,
   *    use {@link ServletContext#getRealPath} instead.
  */
  getRealPath(path: string): string;
  /**
   * Returns the Internet Protocol (IP) source port of the client
   * or last proxy that sent the request.
   *
   * @return an integer specifying the port number
   *
   * @since Servlet 2.4
  */
  getRemotePort(): number;
  /**
   * Returns the host name of the Internet Protocol (IP) interface on
   * which the request was received.
   *
   * @return a String containing the host
   *         name of the IP on which the request was received.
   *
   * @since Servlet 2.4
  */
  getLocalName(): string;
  /**
   * Returns the Internet Protocol (IP) address of the interface on
   * which the request  was received.
   *
   * @return a String containing the
   * IP address on which the request was received. 
   *
   * @since Servlet 2.4
  */
  getLocalAddr(): string;
  /**
   * Returns the Internet Protocol (IP) port number of the interface
   * on which the request was received.
   *
   * @return an integer specifying the port number
   *
   * @since Servlet 2.4
  */
  getLocalPort(): number;
  /**
   * Checks if this request has been put into asynchronous mode.
   *
   * A ServletRequest is put into asynchronous mode by calling
   * {@link #startAsync} or
   * {@link #startAsync(ServletRequest,ServletResponse)} on it.
   * 
   * This method returns false if this request was
   * put into asynchronous mode, but has since been dispatched using
   * one of the {@link AsyncContext#dispatch} methods or released
   * from asynchronous mode via a call to {@link AsyncContext#complete}.
   *
   * @return true if this request has been put into asynchronous mode,
   * false otherwise
   *
   * @since Servlet 3.0
  */
  isAsyncStarted(): boolean;
  /**
   * Checks if this request supports asynchronous operation.
   *
   * Asynchronous operation is disabled for this request if this request
   * is within the scope of a filter or servlet that has not been annotated
   * or flagged in the deployment descriptor as being able to support
   * asynchronous handling.
   *
   * @return true if this request supports asynchronous operation, false
   * otherwise
   *
   * @since Servlet 3.0
  */
  isAsyncSupported(): boolean;
}
/**
 *
 * Extends the {@link ServletResponse} interface to provide HTTP-specific
 * functionality in sending a response.  For example, it has methods
 * to access HTTP headers and cookies.
 *
 * The servlet container creates an HttpServletResponse object
 * and passes it as an argument to the servlet's service methods
 * (doGet, doPost, etc).
 *
 * 
 * @author	Various
 *
 * @see		javax.servlet.ServletResponse
 *
*/
export class HttpServletResponse {
  /**
   * Gets the current status code of this response.
   *
   * @return the current status code of this response
   *
   * @since Servlet 3.0
  */
  getStatus(): number;
  /**
   * Gets the value of the response header with the given name.
   * 
   * If a response header with the given name exists and contains
   * multiple values, the value that was added first will be returned.
   *
   * This method considers only response headers set or added via
   * {@link #setHeader}, {@link #addHeader}, {@link #setDateHeader},
   * {@link #addDateHeader}, {@link #setIntHeader}, or
   * {@link #addIntHeader}, respectively.
   *
   * @param name the name of the response header whose value to return
   *
   * @return the value of the response header with the given name,
   * or null if no header with the given name has been set
   * on this response
   *
   * @since Servlet 3.0
  */
  getHeader(name: string): string;
  /**
   * Gets the values of the response header with the given name.
   *
   * This method considers only response headers set or added via
   * {@link #setHeader}, {@link #addHeader}, {@link #setDateHeader},
   * {@link #addDateHeader}, {@link #setIntHeader}, or
   * {@link #addIntHeader}, respectively.
   *
   * Any changes to the returned Collection must not 
   * affect this HttpServletResponse.
   *
   * @param name the name of the response header whose values to return
   *
   * @return a (possibly empty) Collection of the values
   * of the response header with the given name
   *
   * @since Servlet 3.0
  */
  getHeaders(name: string): Collection<string>;
  /**
   * Gets the names of the headers of this response.
   *
   * This method considers only response headers set or added via
   * {@link #setHeader}, {@link #addHeader}, {@link #setDateHeader},
   * {@link #addDateHeader}, {@link #setIntHeader}, or
   * {@link #addIntHeader}, respectively.
   *
   * Any changes to the returned Collection must not 
   * affect this HttpServletResponse.
   *
   * @return a (possibly empty) Collection of the names
   * of the headers of this response
   *
   * @since Servlet 3.0
  */
  getHeaderNames(): Collection<string>;
  /**
   * Returns the name of the character encoding (MIME charset)
   * used for the body sent in this response.
   * The character encoding may have been specified explicitly
   * using the {@link #setCharacterEncoding} or
   * {@link #setContentType} methods, or implicitly using the
   * {@link #setLocale} method. Explicit specifications take
   * precedence over implicit specifications. Calls made
   * to these methods after getWriter has been
   * called or after the response has been committed have no
   * effect on the character encoding. If no character encoding
   * has been specified, ISO-8859-1 is returned.
   * See RFC 2047 (http://www.ietf.org/rfc/rfc2047.txt)
   * for more information about character encoding and MIME.
   *
   * @return a String specifying the name of
   * the character encoding, for example, UTF-8
  */
  getCharacterEncoding(): string;
  /**
   * Returns the content type used for the MIME body
   * sent in this response. The content type proper must
   * have been specified using {@link #setContentType}
   * before the response is committed. If no content type
   * has been specified, this method returns null.
   * If a content type has been specified, and a
   * character encoding has been explicitly or implicitly
   * specified as described in {@link #getCharacterEncoding}
   * or {@link #getWriter} has been called,
   * the charset parameter is included in the string returned.
   * If no character encoding has been specified, the
   * charset parameter is omitted.
   *
   * @return a String specifying the content type,
   * for example, text/html; charset=UTF-8, or null
   *
   * @since Servlet 2.4
  */
  getContentType(): string;
  /**
   * Returns a {@link ServletOutputStream} suitable for writing binary 
   * data in the response. The servlet container does not encode the
   * binary data.  
   *
   *  Calling flush() on the ServletOutputStream commits the response.
   *
   * Either this method or {@link #getWriter} may 
   * be called to write the body, not both, except when {@link #reset}
   * has been called.
   *
   * @return a {@link ServletOutputStream} for writing binary data 
   *
   * @exception IllegalStateException if the getWriter method
   * has been called on this response
   *
   * @exception IOException if an input or output exception occurred
   *
   * @see #getWriter
   * @see #reset
  */
  getOutputStream(): ServletOutputStream;
  /**
   * Returns a PrintWriter object that
   * can send character text to the client.
   * The PrintWriter uses the character
   * encoding returned by {@link #getCharacterEncoding}.
   * If the response's character encoding has not been
   * specified as described in getCharacterEncoding
   * (i.e., the method just returns the default value 
   * ISO-8859-1), getWriter
   * updates it to ISO-8859-1.
   * Calling flush() on the PrintWriter
   * commits the response.
   * Either this method or {@link #getOutputStream} may be called
   * to write the body, not both, except when {@link #reset}
   * has been called.
   * 
   * @return a PrintWriter object that 
   * can return character data to the client 
   *
   * @exception java.io.UnsupportedEncodingException
   * if the character encoding returned
   * by getCharacterEncoding cannot be used
   *
   * @exception IllegalStateException
   * if the getOutputStream
   * method has already been called for this response object
   *
   * @exception IOException
   * if an input or output exception occurred
   *
   * @see #getOutputStream
   * @see #setCharacterEncoding
   * @see #reset
  */
  getWriter(): PrintWriter;
  /**
   * Returns the actual buffer size used for the response.  If no buffering
   * is used, this method returns 0.
   *
   * @return the actual buffer size used
   *
   * @see #setBufferSize
   * @see #flushBuffer
   * @see #isCommitted
   * @see #reset
  */
  getBufferSize(): number;
  /**
   * Returns a boolean indicating if the response has been
   * committed.  A committed response has already had its status 
   * code and headers written.
   *
   * @return  a boolean indicating if the response has been
   * committed
   *
   * @see #setBufferSize
   * @see #getBufferSize
   * @see #flushBuffer
   * @see #reset
   *
  */
  isCommitted(): boolean;
  /**
   * Returns the locale specified for this response
   * using the {@link #setLocale} method. Calls made to
   * setLocale after the response is committed
   * have no effect. If no locale has been specified,
   * the container's default locale is returned.
   * 
   * @see #setLocale
  */
  getLocale(): Locale;
}
export class HttpSession {
  /**
   *
   * Returns the time when this session was created, measured
   * in milliseconds since midnight January 1, 1970 GMT.
   *
   * @return				a long specifying
   * 					when this session was created,
   *					expressed in 
   *					milliseconds since 1/1/1970 GMT
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  getCreationTime(): number;
  /**
   * Returns a string containing the unique identifier assigned 
   * to this session. The identifier is assigned 
   * by the servlet container and is implementation dependent.
   * 
   * @return				a string specifying the identifier
   *					assigned to this session
  */
  getId(): string;
  /**
   *
   * Returns the last time the client sent a request associated with
   * this session, as the number of milliseconds since midnight
   * January 1, 1970 GMT, and marked by the time the container received the
   * request. 
   *
   * Actions that your application takes, such as getting or setting
   * a value associated with the session, do not affect the access
   * time.
   *
   * @return				a long
   *					representing the last time 
   *					the client sent a request associated
   *					with this session, expressed in 
   *					milliseconds since 1/1/1970 GMT
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  getLastAccessedTime(): number;
  /**
   * Specifies the time, in seconds, between client requests before the 
   * servlet container will invalidate this session. 
   *
   * An interval value of zero or less indicates that the
   * session should never timeout.
   *
   * @param interval		An integer specifying the number
   * 				of seconds 
  */
  setMaxInactiveInterval(interval: number): void;
  /**
   * Returns the maximum time interval, in seconds, that 
   * the servlet container will keep this session open between 
   * client accesses. After this interval, the servlet container
   * will invalidate the session.  The maximum time interval can be set
   * with the setMaxInactiveInterval method.
   *
   * A return value of zero or less indicates that the
   * session will never timeout.
   *
   * @return		an integer specifying the number of
   *			seconds this session remains open
   *			between client requests
   *
   * @see		#setMaxInactiveInterval
  */
  getMaxInactiveInterval(): number;
  /**
   * Returns the object bound with the specified name in this session, or
   * null if no object is bound under the name.
   *
   * @param name		a string specifying the name of the object
   *
   * @return			the object with the specified name
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  getAttribute(name: string): any;
  /**
   * Returns an Enumeration of String objects
   * containing the names of all the objects bound to this session. 
   *
   * @return			an Enumeration of 
   *				String objects specifying the
   *				names of all the objects bound to
   *				this session
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  getAttributeNames(): Enumeration<string>;
  /**
   * Binds an object to this session, using the name specified.
   * If an object of the same name is already bound to the session,
   * the object is replaced.
   *
   * After this method executes, and if the new object
   * implements HttpSessionBindingListener,
   * the container calls 
   * HttpSessionBindingListener.valueBound. The container then   
   * notifies any HttpSessionAttributeListeners in the web 
   * application.
   * If an object was already bound to this session of this name
   * that implements HttpSessionBindingListener, its 
   * HttpSessionBindingListener.valueUnbound method is called.
   *
   * If the value passed in is null, this has the same effect as calling 
   * removeAttribute().
   *
   *
   * @param name			the name to which the object is bound;
   *					cannot be null
   *
   * @param value			the object to be bound
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  setAttribute(name: string, value: any): void;
  /**
   * Removes the object bound with the specified name from
   * this session. If the session does not have an object
   * bound with the specified name, this method does nothing.
   *
   * After this method executes, and if the object
   * implements HttpSessionBindingListener,
   * the container calls 
   * HttpSessionBindingListener.valueUnbound. The container
   * then notifies any HttpSessionAttributeListeners in the web 
   * application.
   *
   * @param name				the name of the object to
   *						remove from this session
   *
   * @exception IllegalStateException	if this method is called on an
   *					invalidated session
  */
  removeAttribute(name: string): void;
  /**
   * Invalidates this session then unbinds any objects bound
   * to it. 
   *
   * @exception IllegalStateException	if this method is called on an
   *					already invalidated session
  */
  invalidate(): void;
  /**
   * Returns true if the client does not yet know about the
   * session or if the client chooses not to join the session.  For 
   * example, if the server used only cookie-based sessions, and
   * the client had disabled the use of cookies, then a session would
   * be new on each request.
   *
   * @return 				true if the 
   *					server has created a session, 
   *					but the client has not yet joined
   *
   * @exception IllegalStateException	if this method is called on an
   *					already invalidated session
  */
  isNew(): boolean;
}
/**
 *  This class represents a part or form item that was received within a
 * multipart/form-data POST request.
 * 
 * @since Servlet 3.0
*/
export class Part {
  /**
   * Gets the content type of this part.
   *
   * @return The content type of this part.
  */
  getContentType(): string;
  /**
   * Gets the name of this part
   *
   * @return The name of this part as a String
  */
  getName(): string;
  /**
   * Gets the file name specified by the client
   *
   * @return the submitted file name
   *
   * @since Servlet 3.1
  */
  getSubmittedFileName(): string;
  /**
   * Returns the size of this fille.
   *
   * @return a long specifying the size of this part, in bytes.
  */
  getSize(): number;
  /**
   *
   * Returns the value of the specified mime header
   * as a String. If the Part did not include a header
   * of the specified name, this method returns null.
   * If there are multiple headers with the same name, this method
   * returns the first header in the part.
   * The header name is case insensitive. You can use
   * this method with any request header.
   *
   * @param name		a String specifying the
   *				header name
   *
   * @return			a String containing the
   *				value of the requested
   *				header, or null
   *				if the part does not
   *				have a header of that name
  */
  getHeader(name: string): string;
  /**
   * Gets the values of the Part header with the given name.
   *
   * Any changes to the returned Collection must not 
   * affect this Part.
   *
   * Part header names are case insensitive.
   *
   * @param name the header name whose values to return
   *
   * @return a (possibly empty) Collection of the values of
   * the header with the given name
  */
  getHeaders(name: string): Collection<string>;
  /**
   * Gets the header names of this Part.
   *
   * Some servlet containers do not allow
   * servlets to access headers using this method, in
   * which case this method returns null
   *
   * Any changes to the returned Collection must not 
   * affect this Part.
   *
   * @return a (possibly empty) Collection of the header
   * names of this Part
  */
  getHeaderNames(): Collection<string>;
}

}
