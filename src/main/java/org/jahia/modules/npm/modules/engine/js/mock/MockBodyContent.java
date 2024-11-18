package org.jahia.modules.npm.modules.engine.js.mock;

import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyContent;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.io.Writer;

public class MockBodyContent extends BodyContent {

    private MockJspWriter writer;


    public MockBodyContent(MockJspWriter writer) {
        super(writer);
        this.writer = writer;
    }


    public Reader getReader() {
        return new StringReader(writer.getString());
    }

    public String getString() {
        return writer.getString();
    }

    public void writeOut(Writer writer) throws IOException {
    }


    //---------------------------------------------------------------------
    // Delegating implementations of JspWriter's abstract methods
    //---------------------------------------------------------------------

    public void clear() throws IOException {
        getEnclosingWriter().clear();
    }

    public void clearBuffer() throws IOException {
        getEnclosingWriter().clearBuffer();
    }

    public void close() throws IOException {
        getEnclosingWriter().close();
    }

    public int getRemaining() {
        return getEnclosingWriter().getRemaining();
    }

    public void newLine() throws IOException {
        getEnclosingWriter().println();
    }

    public void write(char value[], int offset, int length) throws IOException {
        getEnclosingWriter().write(value, offset, length);
    }

    public void print(boolean value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(char value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(char[] value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(double value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(float value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(int value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(long value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(Object value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void print(String value) throws IOException {
        getEnclosingWriter().print(value);
    }

    public void println() throws IOException {
        getEnclosingWriter().println();
    }

    public void println(boolean value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(char value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(char[] value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(double value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(float value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(int value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(long value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(Object value) throws IOException {
        getEnclosingWriter().println(value);
    }

    public void println(String value) throws IOException {
        getEnclosingWriter().println(value);
    }

}
