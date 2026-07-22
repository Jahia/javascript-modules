package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Locale;

import org.jahia.services.content.JCRCallback;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.usermanager.JahiaUserManagerService;
import org.jahia.utils.LanguageCodeConverters;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Helper class to perform JCR operations.
 */
public class JcrHelper {

    private static final Logger logger = LoggerFactory.getLogger(JcrHelper.class);

    /**
     * Execute JCR operations on a JCR session authenticated using the guest user
     * and the "live" workspace.
     * This is intended for server-side use. Example:
     *
     * <pre>
     *     import {server, useServerContext} from '@jahia/javascript-modules-library';
     *     ...
     *     const {renderContext, currentResource} = useServerContext();
     *     server.jcr.doExecuteAsGuest(session => performJcrOperations(session, renderContext, currentResource));
     * </pre>
     *
     * @param callback the callback to execute using the JCR session
     * @return the result of the callback
     */
    public Object doExecuteAsGuest(JCRCallback<Object> callback) {
        return doExecuteAsGuest(callback, null, "live");
    }

    public Object doExecuteAsGuest(JCRCallback<Object> callback, Locale locale, String workspace) {
        JCRTemplate template = JCRTemplate.getInstance();
        Object result = null;
        try {
            result = template.doExecute(JahiaUserManagerService.GUEST_USERNAME, null, workspace, locale, callback);
        } catch (Exception e) {
            logger.error("Error while executing callback as guest", e);
        }
        return result;
    }

    /**
     * Execute JCR operations on a system session (root privileges) on the given workspace and locale.
     * This is intended for server-side code that must write to the repository, such as migration
     * scripts.
     *
     * <p>Unlike {@link #doExecuteAsGuest}, errors are NOT swallowed: they are rethrown to the caller,
     * because callers like the migration runner must detect failures.
     *
     * @param callback  the callback to execute using the JCR session
     * @param language  the session language code (e.g. "en"), or null for a non-localized session
     *                  (translation nodes are then visible as plain subnodes, which is usually what
     *                  migrations want)
     * @param workspace the workspace to open the session on ("default" or "live")
     * @return the result of the callback
     */
    public Object doExecuteAsSystem(JCRCallback<Object> callback, String language, String workspace) {
        Locale locale = language != null ? LanguageCodeConverters.languageCodeToLocale(language) : null;
        try {
            return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, workspace, locale, callback);
        } catch (Exception e) {
            throw new IllegalStateException("Error while executing callback as system: " + e.getMessage(), e);
        }
    }
}
