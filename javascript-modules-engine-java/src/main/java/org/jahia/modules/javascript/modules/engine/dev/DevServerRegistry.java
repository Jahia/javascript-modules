package org.jahia.modules.javascript.modules.engine.dev;

import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The development servers currently attached to this Jahia, one per JavaScript module.
 *
 * <p>A module is "attached" while its developer runs the {@code jahia dev} server: the CLI opens a
 * session holding the origin its Vite server listens on, and the engine then serves that module's
 * client assets from it ({@link DevServlet}) instead of from the deployed bundle. Sessions are held
 * in memory only: a Jahia restart, or a developer walking away, leaves nothing behind.
 */
@Component(service = DevServerRegistry.class, immediate = true)
public class DevServerRegistry {
    private static final Logger logger = LoggerFactory.getLogger(DevServerRegistry.class);

    /** Public path prefix owned by {@link DevServlet}, servlet context path excluded. */
    public static final String DEV_PATH = "/modules" + DevServlet.ALIAS;

    private final Map<String, URI> origins = new ConcurrentHashMap<>();

    /**
     * How many times each module's server bundle was swapped, which is what open pages watch to
     * know they are showing code that no longer exists.
     */
    private final Map<String, AtomicLong> reloads = new ConcurrentHashMap<>();

    /**
     * The path prefix a module's development assets are served under. It is also the {@code base}
     * the module's Vite server must be configured with, so that every URL Vite generates already
     * carries the prefix and keeps flowing back through the engine.
     */
    public static String baseOf(String module) {
        return DEV_PATH + "/" + module + "/";
    }

    public void open(String module, URI origin) {
        origins.put(module, origin);
        reloads.computeIfAbsent(module, key -> new AtomicLong());
        logger.info("Development server attached for module {}: {}", module, origin);
    }

    public void close(String module) {
        reloads.remove(module);
        if (origins.remove(module) != null) {
            logger.info("Development server detached for module {}", module);
        }
    }

    /** Counts one more swap of this module's server bundle. */
    public void reloaded(String module) {
        reloads.computeIfAbsent(module, key -> new AtomicLong()).incrementAndGet();
    }

    /** How many times every attached module was reloaded, as one opaque string for open pages. */
    public String reloadStamp() {
        StringBuilder stamp = new StringBuilder();
        reloads.forEach((module, count) -> stamp.append(module).append('=').append(count.get()).append(';'));
        return stamp.toString();
    }

    /**
     * The script that reloads a page when the module it shows has been rebuilt.
     *
     * <p>It polls rather than holding a connection open: a websocket would have to survive Jahia's
     * filter chain and the OSGi HTTP bridge, which is a lot of machinery to buy back half a second.
     *
     * @param contextPath the servlet context path, which the browser's URLs have to carry
     * @return the script, or an empty string when no module is being developed
     */
    public String clientScript(String contextPath) {
        if (origins.isEmpty()) {
            return "";
        }
        String url = contextPath + DEV_PATH + "/" + origins.keySet().iterator().next() + "/@jahia/reloads";
        return "<script>(function(){var s=null;setInterval(function(){"
                + "fetch(" + quote(url) + ",{cache:'no-store'}).then(function(r){return r.text()})"
                + ".then(function(t){if(s===null){s=t}else if(s!==t){location.reload()}})"
                + ".catch(function(){})},500)})()</script>";
    }

    private static String quote(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'";
    }

    /** The Vite origin serving this module, or null when no development server is attached. */
    public URI originOf(String module) {
        return origins.get(module);
    }

    public boolean isAttached(String module) {
        return origins.containsKey(module);
    }
}
