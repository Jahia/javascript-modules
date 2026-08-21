package org.jahia.modules.javascript.modules.engine.contentpatches.impl;

import org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchOperations;
import org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchService;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Publishes the content patch operations as an OSGi service for Groovy patch scripts and Java
 * modules. JavaScript content patches don't go through here — their registrar hands them the same
 * engine through the {@code registerContentPatch} context.
 */
@Component(service = ContentPatchService.class, immediate = true)
public class ContentPatchServiceImpl implements ContentPatchService {

    /** Root of the per-module/per-patch logger names used by content patch executions. */
    public static final String LOGGER_PREFIX = "org.jahia.modules.javascript.modules.engine.contentpatches.";

    @Override
    public ContentPatchOperations operations(String moduleId) {
        return operations(moduleId, false, null);
    }

    @Override
    public ContentPatchOperations operations(String moduleId, boolean dryRun, Logger logger) {
        if (moduleId == null || moduleId.isBlank()) {
            throw new IllegalArgumentException("moduleId is required: definition operations are restricted "
                    + "to the node types owned by the module the patch belongs to");
        }
        return new ContentPatchOperationsImpl(moduleId, dryRun,
                logger != null ? logger : LoggerFactory.getLogger(LOGGER_PREFIX + moduleId));
    }
}
