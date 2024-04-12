declare module 'javax.servlet' {
import { Locale, Enumeration, Map } from 'java.util';
import { BufferedReader } from 'java.io';
export class ServletInputStream {
  /**
   *
   * Reads the input stream, one line at a time. Starting at an
   * offset, reads bytes into an array, until it reads a certain number
   * of bytes or reaches a newline character, which it reads into the
   * array as well.
   *
   * This method returns -1 if it reaches the end of the input
   * stream before reading the maximum number of bytes.
   *
   *
   *
   * @param b 		an array of bytes into which data is read
   *
   * @param off 		an integer specifying the character at which
   *				this method begins reading
   *
   * @param len		an integer specifying the maximum number of 
   *				bytes to read
   *
   * @return			an integer specifying the actual number of bytes 
   *				read, or -1 if the end of the stream is reached
   *
   * @exception IOException	if an input or output exception has occurred
   *
  */
  readLine(b: number[], off: number, len: number): number;
  /**
   * Returns true when all the data from the stream has been read else
   * it returns false.
   *
   * @return true when all data for this particular request
   *  has been read, otherwise returns false.
   *
   * @since Servlet 3.1
  */
  isFinished(): boolean;
  /**
   * Returns true if data can be read without blocking else returns
   * false.
   *
   * @return true if data can be obtained without blocking,
   *  otherwise returns false.
   *
   * @since Servlet 3.1
  */
  isReady(): boolean;
}
export class ServletOutputStream {
  print(s: string): void;
  print(b: boolean): void;
  print(i: number): void;
  println(): void;
  println(s: string): void;
  println(b: boolean): void;
  println(i: number): void;
}
/**
 * Defines an object to provide client request information to a servlet.  The
 * servlet container creates a ServletRequest object and passes
 * it as an argument to the servlet's service method.
 *
 * A ServletRequest object provides data including
 * parameter name and values, attributes, and an input stream.
 * Interfaces that extend ServletRequest can provide
 * additional protocol-specific data (for example, HTTP data is
 * provided by {@link javax.servlet.http.HttpServletRequest}.
 * 
 * @author Various
 *
 * @see javax.servlet.http.HttpServletRequest
 *
*/
export class ServletRequest {
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

}
