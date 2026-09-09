package org.jahia.modules.javascript.modules.engine.contentpatches;

import org.jahia.services.content.JCRNodeWrapper;

import javax.jcr.RepositoryException;

/**
 * Computes the value {@link ContentPatchOperations#setPropertyValues} writes on one node. Groovy
 * closures and JavaScript functions coerce to this interface natively.
 */
@FunctionalInterface
public interface PropertyValueResolver {

    /**
     * Resolves the value to set on this node — for an internationalized property, once per target
     * locale.
     *
     * @param node   the node being processed
     * @param locale the locale being written (e.g. {@code "en"}), or null for a
     *               non-internationalized property
     * @return the value to set (string, number, boolean, {@code Node}, or a raw JCR {@code Value});
     *         null leaves the node/locale untouched
     */
    Object resolve(JCRNodeWrapper node, String locale) throws RepositoryException;
}
