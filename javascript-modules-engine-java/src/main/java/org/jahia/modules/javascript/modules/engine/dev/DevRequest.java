package org.jahia.modules.javascript.modules.engine.dev;

/**
 * A parsed {@link DevServlet} request path.
 *
 * <p>Two shapes share the servlet's path space, told apart by the {@code @jahia/} segment, which
 * cannot collide with a Vite URL (Vite's own reserved segments are {@code @vite/}, {@code @id/},
 * {@code @fs/} and {@code @react-refresh}):
 *
 * <ul>
 *   <li>{@code /<module>/@jahia/<command>} — the CLI driving the session or pushing a build,
 *   <li>{@code /<module>/<anything else>} — the browser fetching an asset, proxied to Vite.
 * </ul>
 */
public final class DevRequest {
    private static final String COMMAND_SEGMENT = "@jahia/";

    private final String module;
    private final String command;

    private DevRequest(String module, String command) {
        this.module = module;
        this.command = command;
    }

    /**
     * @param pathInfo the servlet path info, i.e. everything after {@code /modules/jsm-dev}
     * @return the parsed request, or null when the path names no module
     */
    public static DevRequest parse(String pathInfo) {
        if (pathInfo == null || pathInfo.length() < 2 || pathInfo.charAt(0) != '/') {
            return null;
        }
        String path = pathInfo.substring(1);
        int slash = path.indexOf('/');
        String module = slash < 0 ? path : path.substring(0, slash);
        if (module.isEmpty()) {
            return null;
        }
        String rest = slash < 0 ? "" : path.substring(slash + 1);
        return new DevRequest(module, rest.startsWith(COMMAND_SEGMENT)
                ? rest.substring(COMMAND_SEGMENT.length())
                : null);
    }

    /** The module's OSGi symbolic name. */
    public String getModule() {
        return module;
    }

    /** The CLI command, or null when this request is an asset fetch. */
    public String getCommand() {
        return command;
    }

    public boolean isCommand() {
        return command != null;
    }
}
