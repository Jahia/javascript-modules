package org.jahia.modules.javascript.modules.engine.contentpatches;

import org.slf4j.Logger;

/**
 * Entry point to the {@link ContentPatchOperations content patch operations} for Java and Groovy
 * callers, published as an OSGi service by the JavaScript modules engine.
 *
 * <p>A Groovy {@code META-INF/patches} script (which only receives the {@code log} and
 * {@code setResult} bindings) obtains it dynamically, with no compile-time dependency on this
 * package:
 *
 * <pre>
 * def ops = org.jahia.osgi.BundleUtils.getOsgiService(
 *         "org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchService", null)
 *         .operations("my-module", false, log)
 * ops.removePropertyValues(nodeType: "mymod:banner", property: "color")
 * </pre>
 *
 * <p>JavaScript modules do not use this service: their content patches receive the same operations
 * through the {@code registerContentPatch} context ({@code patch.*} and {@code jcr.forEachNode}).
 */
public interface ContentPatchService {

    /**
     * Operations bound to a module, with dry-run off and a default logger
     * ({@code org.jahia.modules.javascript.modules.engine.contentpatches.<moduleId>}).
     *
     * @param moduleId symbolic name of the module the patch belongs to — definition operations
     *                 ({@code removeNodeType}, {@code changeNodeType}) only accept node types owned
     *                 by this module
     */
    ContentPatchOperations operations(String moduleId);

    /**
     * Operations bound to a module.
     *
     * @param moduleId symbolic name of the module the patch belongs to — definition operations
     *                 ({@code removeNodeType}, {@code changeNodeType}) only accept node types owned
     *                 by this module
     * @param dryRun   when true, operations log what they would change and discard instead of
     *                 saving (definition operations don't unregister either)
     * @param logger   receives the operations' progress and report lines; null for the default
     *                 logger
     */
    ContentPatchOperations operations(String moduleId, boolean dryRun, Logger logger);
}
