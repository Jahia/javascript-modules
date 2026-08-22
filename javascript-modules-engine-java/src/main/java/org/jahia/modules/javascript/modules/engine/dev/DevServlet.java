package org.jahia.modules.javascript.modules.engine.dev;

import org.apache.commons.io.IOUtils;
import org.jahia.modules.javascript.modules.engine.JavascriptModuleListener;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.usermanager.JahiaUser;
import org.jahia.settings.SettingsBean;
import org.osgi.framework.Bundle;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.ConfigurationPolicy;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The development endpoint of the JavaScript modules engine, serving {@code /modules/jsm-dev/*}.
 *
 * <p>It exists to collapse the edit-to-visible loop of a module under development, and it does two
 * things for the one module whose {@code jahia dev} server holds a session:
 *
 * <ul>
 *   <li><strong>client assets</strong> — every request under {@code /modules/jsm-dev/<module>/} is
 *       proxied verbatim to that module's Vite server, which serves islands and stylesheets
 *       transformed on demand, with hot module replacement. The path is forwarded unchanged because
 *       Vite is configured with this very prefix as its {@code base}, so the URLs it generates come
 *       back through here on their own.
 *   <li><strong>server views</strong> — {@code POST @jahia/server-bundle} replaces the module's
 *       server bundle inside the running GraalVM engine, skipping the pack, the upload, the JCR
 *       write and the OSGi restart a redeploy pays for.
 * </ul>
 *
 * <p><strong>This endpoint executes JavaScript that the caller supplies, inside the Jahia JVM.</strong>
 * It is therefore refused unless Jahia runs in development mode, and every request that changes
 * something additionally requires the root user. A production instance left in development mode is
 * still protected by the second gate.
 */
@Component(
        service = {HttpServlet.class, Servlet.class},
        property = {"alias=" + DevServlet.ALIAS, "enabled:Boolean=false"},
        configurationPolicy = ConfigurationPolicy.OPTIONAL,
        immediate = true)
public class DevServlet extends HttpServlet {
    /** Jahia serves a module servlet alias under {@code /modules}, so this is {@code /modules/jsm-dev}. */
    public static final String ALIAS = "/jsm-dev";

    private static final Logger logger = LoggerFactory.getLogger(DevServlet.class);

    private static final String COMMAND_SESSION = "session";
    private static final String COMMAND_SERVER_BUNDLE = "server-bundle";
    private static final String COMMAND_RELOADS = "reloads";

    /** A pushed server bundle is held in memory as a string; refuse anything a build would never emit. */
    private static final int MAX_BUNDLE_BYTES = 32 * 1024 * 1024;

    /**
     * Headers a proxy owns rather than forwards.
     *
     * @see <a href="https://www.rfc-editor.org/rfc/rfc9110#section-7.6.1">RFC 9110, connection-specific header fields</a>
     */
    private static final Set<String> HOP_BY_HOP = Set.of("connection", "keep-alive", "proxy-authenticate",
            "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    private DevServerRegistry registry;
    private JavascriptModuleListener moduleListener;

    /**
     * Whether this endpoint answers at all. Development mode is not enough to imply it: Jahia's
     * operating mode defaults to development, including in the published images, so a switch that
     * development mode turned on would be on almost everywhere.
     */
    private boolean enabled;

    @Activate
    @Modified
    public void activate(Map<String, Object> properties) {
        enabled = Boolean.parseBoolean(String.valueOf(properties.getOrDefault("enabled", Boolean.FALSE)));
        if (enabled && isDevelopmentMode()) {
            logger.warn("The JavaScript modules development endpoint is open at /modules{}. It replaces the code of "
                    + "a running module and serves a developer's files: never enable it on a shared instance.", ALIAS);
        }
    }

    @Reference
    public void setRegistry(DevServerRegistry registry) {
        this.registry = registry;
    }

    @Reference
    public void setModuleListener(JavascriptModuleListener moduleListener) {
        this.moduleListener = moduleListener;
    }

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!enabled || !isDevelopmentMode()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        DevRequest devRequest = DevRequest.parse(request.getPathInfo());
        if (devRequest == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        if (!devRequest.isCommand()) {
            proxyToDevServer(devRequest.getModule(), request, response);
            return;
        }

        if (COMMAND_RELOADS.equals(devRequest.getCommand())) {
            // read by every open page, so it is the one command that cannot require the root user
            response.setContentType("text/plain;charset=UTF-8");
            response.setHeader("Cache-Control", "no-store");
            response.getWriter().write(registry.reloadStamp());
            return;
        }

        if (!isRoot()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "The development endpoint requires the root user");
            return;
        }

        switch (devRequest.getCommand()) {
            case COMMAND_SESSION:
                handleSession(devRequest.getModule(), request, response);
                break;
            case COMMAND_SERVER_BUNDLE:
                handleServerBundle(devRequest.getModule(), request, response);
                break;
            default:
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
        }
    }

    /** Attaches ({@code POST}) or detaches ({@code DELETE}) a module's development server. */
    private void handleSession(String module, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        if ("DELETE".equals(request.getMethod())) {
            registry.close(module);
            writeJson(response, HttpServletResponse.SC_OK, "{\"attached\":false}");
            return;
        }
        if (!"POST".equals(request.getMethod())) {
            response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
            return;
        }

        Optional<Bundle> bundle = findModule(module);
        if (bundle.isEmpty()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "No JavaScript module named " + module + " is started");
            return;
        }

        URI origin;
        try {
            origin = parseOrigin(request.getParameter("origin"));
        } catch (IllegalArgumentException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
            return;
        }

        if (!isReachable(origin)) {
            // Jahia often runs in a container, where the developer's `localhost` is not this host's:
            // saying so here is what lets the CLI try the name the container knows it by
            response.sendError(HttpServletResponse.SC_BAD_GATEWAY, "Jahia cannot reach " + origin);
            return;
        }

        registry.open(module, origin);
        writeJson(response, HttpServletResponse.SC_OK,
                "{\"attached\":true,\"base\":\"" + DevServerRegistry.baseOf(module) + "\"}");
    }

    /** Replaces the module's server bundle with the pushed one and re-registers what it declares. */
    private void handleServerBundle(String module, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        if (!"POST".equals(request.getMethod())) {
            response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
            return;
        }

        Optional<Bundle> bundle = findModule(module);
        if (bundle.isEmpty()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "No JavaScript module named " + module + " is started");
            return;
        }

        byte[] code = IOUtils.toByteArray(request.getInputStream());
        if (code.length == 0) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Empty server bundle");
            return;
        }
        if (code.length > MAX_BUNDLE_BYTES) {
            response.sendError(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            return;
        }

        long start = System.nanoTime();
        try {
            moduleListener.reloadServerBundle(bundle.get(), new String(code, StandardCharsets.UTF_8));
        } catch (RuntimeException e) {
            logger.error("Cannot reload the server bundle of {}", module, e);
            writeJson(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "{\"reloaded\":false,\"error\":" + jsonString(String.valueOf(e.getMessage())) + "}");
            return;
        }
        registry.reloaded(module);
        long millis = (System.nanoTime() - start) / 1_000_000;
        logger.info("Reloaded the server bundle of {} in {} ms", module, millis);
        writeJson(response, HttpServletResponse.SC_OK, "{\"reloaded\":true,\"ms\":" + millis + "}");
    }

    /**
     * Forwards an asset request to the module's Vite server, path untouched.
     *
     * <p>Only safe methods are forwarded: this proxy exists to serve source files, and a module's
     * development server is not a place to POST to through Jahia.
     */
    private void proxyToDevServer(String module, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        URI origin = registry.originOf(module);
        if (origin == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "No development server is attached to " + module);
            return;
        }
        String method = request.getMethod();
        if (!"GET".equals(method) && !"HEAD".equals(method)) {
            response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
            return;
        }

        // Rebuilt from the prefix this servlet owns rather than read off the request: Jahia dispatches
        // into OSGi through a proxy servlet mapped at /modules, so the request URI arrives without it
        String path = DevServerRegistry.DEV_PATH + request.getPathInfo();
        String query = request.getQueryString();
        URI upstream = URI.create(origin + path + (query == null ? "" : "?" + query));

        HttpRequest.Builder forward = HttpRequest.newBuilder(upstream)
                .method(method, HttpRequest.BodyPublishers.noBody())
                .timeout(Duration.ofSeconds(30));
        copyRequestHeaders(request, forward);

        HttpResponse<java.io.InputStream> upstreamResponse;
        try {
            upstreamResponse = httpClient.send(forward.build(), HttpResponse.BodyHandlers.ofInputStream());
        } catch (IOException e) {
            logger.warn("Development server of {} is unreachable at {}: {}", module, origin, e.toString());
            response.sendError(HttpServletResponse.SC_BAD_GATEWAY,
                    "The development server of " + module + " is unreachable");
            return;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            response.sendError(HttpServletResponse.SC_BAD_GATEWAY);
            return;
        }

        response.setStatus(upstreamResponse.statusCode());
        upstreamResponse.headers().map().forEach((name, values) -> {
            if (!HOP_BY_HOP.contains(name.toLowerCase(Locale.ROOT))) {
                values.forEach(value -> response.addHeader(name, value));
            }
        });
        // Source served from a developer's editor: never let anything hold on to it
        response.setHeader("Cache-Control", "no-store");

        try (java.io.InputStream body = upstreamResponse.body(); OutputStream out = response.getOutputStream()) {
            IOUtils.copy(body, out);
        }
    }

    private void copyRequestHeaders(HttpServletRequest request, HttpRequest.Builder forward) {
        for (String name : List.of("accept", "accept-encoding", "accept-language", "if-none-match",
                "if-modified-since", "user-agent", "referer", "origin", "sec-fetch-dest", "sec-fetch-mode")) {
            String value = request.getHeader(name);
            if (value != null) {
                forward.header(name, value);
            }
        }
    }

    /** @return the origin, guaranteed to be an absolute http(s) URI with no path */
    private static URI parseOrigin(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing origin parameter");
        }
        URI origin = URI.create(value.trim());
        if (!origin.isAbsolute() || origin.getHost() == null
                || !List.of("http", "https").contains(origin.getScheme())) {
            throw new IllegalArgumentException("Not an http(s) origin: " + value);
        }
        if (origin.getPath() != null && !origin.getPath().isEmpty() && !"/".equals(origin.getPath())) {
            throw new IllegalArgumentException("The origin carries a path: " + value);
        }
        return URI.create(origin.getScheme() + "://" + origin.getAuthority());
    }

    /** Whether the development server answers, so that a session is never opened onto a dead origin. */
    private boolean isReachable(URI origin) {
        try {
            httpClient.send(
                    HttpRequest.newBuilder(origin).method("HEAD", HttpRequest.BodyPublishers.noBody())
                            .timeout(Duration.ofSeconds(2)).build(),
                    HttpResponse.BodyHandlers.discarding());
            return true;
        } catch (IOException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private Optional<Bundle> findModule(String module) {
        return moduleListener.getJavascriptModules().stream()
                .filter(bundle -> module.equals(bundle.getSymbolicName()))
                .findFirst();
    }

    private static boolean isDevelopmentMode() {
        SettingsBean settings = SettingsBean.getInstance();
        return settings != null && settings.isDevelopmentMode();
    }

    private static boolean isRoot() {
        JahiaUser user = JCRSessionFactory.getInstance().getCurrentUser();
        return user != null && user.isRoot();
    }

    private static void writeJson(HttpServletResponse response, int status, String body) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(body);
    }

    private static String jsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ") + "\"";
    }
}
