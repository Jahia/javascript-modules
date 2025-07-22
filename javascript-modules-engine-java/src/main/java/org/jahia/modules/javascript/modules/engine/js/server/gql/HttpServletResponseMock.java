package org.jahia.modules.javascript.modules.engine.js.server.gql;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Collection;
import java.util.Collections;
import java.util.Locale;

/**
 * A mock implementation of {@link HttpServletResponse} used for testing and server-side rendering
 * within the Jahia JavaScript modules engine.
 *
 * <p>This class provides a minimal, non-functional implementation of the HttpServletResponse interface
 * that can be used in environments where a real HTTP response context is not available, such as during
 * server-side rendering of JavaScript components or in unit tests.</p>
 *
 * <p>Key characteristics of this mock implementation:</p>
 * <ul>
 *   <li>Provides a functional {@link ServletOutputStream} through {@link ServletOutputStreamMock}</li>
 *   <li>Supports character encoding configuration via constructor</li>
 *   <li>Returns sensible default values for most methods (null, empty collections, or false)</li>
 *   <li>URL encoding methods return the original URL unchanged</li>
 *   <li>Header and cookie operations are no-ops (do nothing)</li>
 *   <li>Error handling and redirection methods are no-ops</li>
 *   <li>Buffer and locale operations return default values</li>
 * </ul>
 *
 * <p>The primary use case is to provide a minimal response context when executing JavaScript
 * code that expects an HttpServletResponse object to be available, particularly during
 * server-side rendering scenarios where output needs to be captured through the ServletOutputStream.</p>
 *
 * @see HttpServletResponse
 * @see ServletOutputStreamMock
 */
class HttpServletResponseMock implements HttpServletResponse {
    private final ServletOutputStream out;
    private final String characterEncoding;

    public HttpServletResponseMock(String characterEncoding) {
        this.out = new ServletOutputStreamMock(characterEncoding);
        this.characterEncoding = characterEncoding;
    }

    @Override
    public void addCookie(Cookie cookie) {

    }

    @Override
    public boolean containsHeader(String name) {
        return false;
    }

    @Override
    public String encodeURL(String url) {
        return url;
    }

    @Override
    public String encodeRedirectURL(String url) {
        return null;
    }

    @Override
    public String encodeUrl(String url) {
        return null;
    }

    @Override
    public String encodeRedirectUrl(String url) {
        return null;
    }

    @Override
    public void sendError(int sc, String msg) throws IOException {

    }

    @Override
    public void sendError(int sc) throws IOException {

    }

    @Override
    public void sendRedirect(String location) throws IOException {

    }

    @Override
    public void setDateHeader(String name, long date) {

    }

    @Override
    public void addDateHeader(String name, long date) {

    }

    @Override
    public void setHeader(String name, String value) {

    }

    @Override
    public void addHeader(String name, String value) {

    }

    @Override
    public void setIntHeader(String name, int value) {

    }

    @Override
    public void addIntHeader(String name, int value) {

    }

    @Override
    public void setStatus(int sc, String sm) {

    }

    @Override
    public int getStatus() {
        return 0;
    }

    @Override
    public void setStatus(int sc) {

    }

    @Override
    public String getHeader(String s) {
        return null;
    }

    @Override
    public Collection<String> getHeaders(String s) {
        return Collections.emptyList();
    }

    @Override
    public Collection<String> getHeaderNames() {
        return Collections.emptyList();
    }

    @Override
    public String getCharacterEncoding() {
        return characterEncoding;
    }

    @Override
    public void setCharacterEncoding(String charset) {

    }

    @Override
    public String getContentType() {
        return null;
    }

    @Override
    public void setContentType(String type) {

    }

    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        return out;
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        return null;
    }

    @Override
    public void setContentLength(int len) {

    }

    @Override
    public void setContentLengthLong(long l) {

    }

    @Override
    public int getBufferSize() {
        return 0;
    }

    @Override
    public void setBufferSize(int size) {

    }

    @Override
    public void flushBuffer() throws IOException {

    }

    @Override
    public void resetBuffer() {

    }

    @Override
    public boolean isCommitted() {
        return false;
    }

    @Override
    public void reset() {

    }

    @Override
    public Locale getLocale() {
        return null;
    }

    @Override
    public void setLocale(Locale loc) {

    }
}
