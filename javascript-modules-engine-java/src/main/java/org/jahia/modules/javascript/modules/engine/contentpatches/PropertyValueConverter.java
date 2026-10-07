package org.jahia.modules.javascript.modules.engine.contentpatches;

import org.jahia.services.content.JCRNodeWrapper;

import javax.jcr.RepositoryException;
import javax.jcr.Value;

/**
 * Converts one stored value for {@link ContentPatchOperations#convertPropertyValues}. Groovy
 * closures and JavaScript functions coerce to this interface natively.
 */
@FunctionalInterface
public interface PropertyValueConverter {

    /**
     * Converts one stored value (which may still carry the previous data type) to the new value.
     *
     * @param value the currently stored value
     * @param node  the node owning the property (for a translated property, the main node — not the
     *              translation subnode)
     * @return the converted value (string, number, boolean, {@code Node}, or a raw JCR
     *         {@code Value}); null leaves the stored value untouched
     */
    Object convert(Value value, JCRNodeWrapper node) throws RepositoryException;
}
