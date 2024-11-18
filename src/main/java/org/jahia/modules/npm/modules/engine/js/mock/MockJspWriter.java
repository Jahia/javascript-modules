/*
 * Copyright (C) 2002-2023 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.modules.npm.modules.engine.js.mock;

import javax.servlet.jsp.JspWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;

/**
 * Mock implementation of the {@link javax.servlet.jsp.JspWriter} class.
 *
 * <p>Used for testing the web framework; only necessary for testing
 * applications when testing custom JSP tags.
 *
 * @author Juergen Hoeller
 * @since 2.5
 */
public class MockJspWriter extends JspWriter {

    private StringWriter originalWriter;
    private PrintWriter targetWriter;

    /**
     * Create a MockJspWriter.
     */
    public MockJspWriter() {
        super(DEFAULT_BUFFER, true);
        init();
    }

    private void init() {
        this.originalWriter = new StringWriter();
        this.targetWriter = new PrintWriter(this.originalWriter);
    }

    protected PrintWriter getTargetWriter() throws IOException {
        return this.targetWriter;
    }

    public String getString() {
        return this.originalWriter.getBuffer().toString();
    }

    public void clear() throws IOException {
        flush();
        init();
    }

    public void clearBuffer() throws IOException {
    }

    public void flush() throws IOException {
        targetWriter.flush();
        originalWriter.flush();
    }

    public void close() throws IOException {
        flush();
    }

    public int getRemaining() {
        return Integer.MAX_VALUE;
    }

    public void newLine() throws IOException {
        getTargetWriter().println();
    }

    public void write(char[] value, int offset, int length) throws IOException {
        getTargetWriter().write(value, offset, length);
    }

    public void print(boolean value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(char value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(char[] value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(double value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(float value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(int value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(long value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(Object value) throws IOException {
        getTargetWriter().print(value);
    }

    public void print(String value) throws IOException {
        getTargetWriter().print(value);
    }

    public void println() throws IOException {
        getTargetWriter().println();
    }

    public void println(boolean value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(char value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(char[] value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(double value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(float value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(int value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(long value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(Object value) throws IOException {
        getTargetWriter().println(value);
    }

    public void println(String value) throws IOException {
        getTargetWriter().println(value);
    }
}
