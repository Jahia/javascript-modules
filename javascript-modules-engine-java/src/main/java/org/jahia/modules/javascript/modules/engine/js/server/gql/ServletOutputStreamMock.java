package org.jahia.modules.javascript.modules.engine.js.server.gql;

import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * A mock implementation of {@link ServletOutputStream} that captures output to an internal buffer
 * for testing and server-side rendering within the Jahia JavaScript modules engine.
 *
 * <p>This class extends ServletOutputStream and provides a functional implementation that writes
 * data to an internal {@link ByteArrayOutputStream} buffer. This allows capturing and retrieving
 * the output content as a string, which is particularly useful during server-side rendering
 * scenarios where the rendered content needs to be captured and processed.</p>
 *
 * <p>Key features of this mock implementation:</p>
 * <ul>
 *   <li>Captures all written data in an internal {@link ByteArrayOutputStream} buffer</li>
 *   <li>Supports configurable character encoding for string conversion</li>
 *   <li>Defaults to UTF-8 encoding if no encoding is specified</li>
 *   <li>Always reports as ready for writing ({@link #isReady()} returns true)</li>
 *   <li>Provides a {@link #getContent()} method to retrieve buffered content as a string</li>
 *   <li>Write listener operations are no-ops (not supported)</li>
 * </ul>
 *
 * <p>The primary use case is to capture output from JavaScript components during server-side
 * rendering, allowing the rendered HTML content to be retrieved and used within the Jahia
 * framework. The captured content can be accessed via the {@link #getContent()} method.</p>
 *
 * @see ServletOutputStream
 * @see HttpServletResponseMock
 */

class ServletOutputStreamMock extends ServletOutputStream {

    private final String characterEncoding;

    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();

    public ServletOutputStreamMock(String characterEncoding) {
        this.characterEncoding = characterEncoding;
    }

    @Override
    public void write(int b) throws IOException {
        buffer.write(b);
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    public void setWriteListener(WriteListener writeListener) {
    }

    public String getContent() {
        try {
            return buffer.toString(characterEncoding != null ? characterEncoding : StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }
}
