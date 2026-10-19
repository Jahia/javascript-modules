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
package org.jahia.modules.javascript.modules.engine.views;

import org.jahia.modules.javascript.modules.engine.jsengine.SourceMaps;
import org.jahia.settings.SettingsBean;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Turns a failed view render into something a developer can act on.
 *
 * <p>A failing view leaves nothing useful on the page. Depending on where the failure lands in the
 * render chain it either propagates as a server error, or is swallowed into an HTML comment by
 * {@code AbstractFilter#getContentForError} — carrying the message in development mode, and only a
 * timestamp pointing at the logs in production. The message a developer needs is therefore either
 * absent from the page or hidden in its source, and the stack that reaches the logs points inside
 * the module's bundle.
 *
 * <p>In development mode the fragment is replaced instead by a visible box carrying the message and
 * the stack trace, with positions mapped back to the module's own sources. Production rendering is
 * left untouched: what failed there before still fails the same way.
 */
public final class ViewRenderError {

    private ViewRenderError() {
    }

    /** Whether failing views should render an error box instead of propagating the failure. */
    public static boolean isDevelopmentMode() {
        SettingsBean settings = SettingsBean.getInstance();
        return settings != null && settings.isDevelopmentMode();
    }

    /**
     * Renders the error as an HTML fragment.
     *
     * <p>Everything interpolated comes from module code, so it is HTML-escaped: an error message is
     * not trusted markup.
     */
    public static String render(String viewKey, Throwable error, SourceMaps sourceMaps) {
        return "<div style=\"margin:.5rem 0;padding:.75rem 1rem;border:2px solid #d33;border-radius:4px;"
                + "background:#fff5f5;color:#900;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace\">"
                + "<strong>Failed to render " + escape(viewKey) + "</strong>"
                + "<div style=\"margin:.35rem 0;font-weight:bold\">" + escape(message(error))
                + "</div><pre style=\"margin:0;white-space:pre-wrap;overflow-x:auto\">"
                + escape(stackTrace(error, sourceMaps)) + "</pre>"
                + "<div style=\"margin-top:.35rem;opacity:.7\">This box is only rendered in development mode.</div>"
                + "</div>";
    }

    /** Escapes text coming from module code: an error message is data, not markup. */
    private static String escape(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /** The message of the innermost cause, which is the one the module author wrote. */
    private static String message(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String message = root.getMessage();
        return message != null ? message : root.toString();
    }

    /** The full stack trace, with generated positions mapped back to module sources. */
    public static String stackTrace(Throwable error, SourceMaps sourceMaps) {
        StringWriter writer = new StringWriter();
        error.printStackTrace(new PrintWriter(writer));
        return sourceMaps.rewrite(writer.toString());
    }
}
