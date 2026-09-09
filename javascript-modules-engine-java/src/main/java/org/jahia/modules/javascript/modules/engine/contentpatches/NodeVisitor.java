package org.jahia.modules.javascript.modules.engine.contentpatches;

import org.jahia.services.content.JCRNodeWrapper;

import javax.jcr.RepositoryException;

/**
 * Per-node callback of {@link ContentPatchOperations#forEachNode}. Groovy closures and JavaScript
 * functions coerce to this interface natively.
 */
@FunctionalInterface
public interface NodeVisitor {

    /**
     * Processes one selected node. The enclosing batch is saved (or discarded in dry-run mode) by
     * the iteration engine — do not call {@code session.save()} here.
     *
     * @return {@link Boolean#FALSE} to count the node as skipped instead of updated; any other
     *         value (including null) counts it as updated
     * @throws RepositoryException failures propagate and fail the content patch
     */
    Object visit(JCRNodeWrapper node) throws RepositoryException;
}
