package org.jahia.modules.javascript.modules.engine.contentpatches.impl;

import org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchOperations;
import org.jahia.modules.javascript.modules.engine.contentpatches.NodeVisitor;
import org.jahia.modules.javascript.modules.engine.contentpatches.OperationReport;
import org.jahia.modules.javascript.modules.engine.contentpatches.PropertyValueConverter;
import org.jahia.modules.javascript.modules.engine.contentpatches.PropertyValueResolver;
import org.jahia.services.content.JCRCallback;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.slf4j.Logger;

import javax.jcr.Node;
import javax.jcr.NodeIterator;
import javax.jcr.Property;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.jcr.nodetype.ConstraintViolationException;
import javax.jcr.nodetype.NoSuchNodeTypeException;
import javax.jcr.query.Query;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The language-neutral content patch operations engine: batching, i18n handling, definition guard
 * rails and dry-run live here, once — the TypeScript library and Groovy/Java callers are façades
 * over this class.
 *
 * <p>Options maps may come from the JVM (Groovy named arguments, Java maps) or from GraalJS (object
 * literals coerced to {@code Map} views whose nested objects/arrays surface as polyglot values) —
 * the option readers accept both. Callbacks are functional interfaces, which Groovy closures and JS
 * functions coerce to natively; guest exceptions thrown by a JS callback must cross this class
 * untouched (never caught, never wrapped) so GraalVM can restore their identity when they re-enter
 * JS — the {@code skip()} detection depends on it.
 */
public class ContentPatchOperationsImpl implements ContentPatchOperations {

    /** Page size used when snapshotting the identifiers of the nodes to process. */
    private static final int SNAPSHOT_PAGE_SIZE = 1000;

    private static final List<String> DEFAULT_WORKSPACES = Arrays.asList("default", "live");
    private static final int DEFAULT_BATCH_SIZE = 100;

    private final String moduleId;
    private final boolean dryRun;
    private final Logger log;

    /**
     * @param moduleId symbolic name of the module the patch belongs to — definition operations only
     *                 accept node types owned by it
     * @param dryRun   when true, batches are discarded instead of saved and definitions are not
     *                 unregistered
     * @param log      receives the progress and report lines
     */
    public ContentPatchOperationsImpl(String moduleId, boolean dryRun, Logger log) {
        this.moduleId = moduleId;
        this.dryRun = dryRun;
        this.log = log;
    }

    // === Seams overridable in unit tests ===

    protected <T> T withSystemSession(String workspace, JCRCallback<T> callback) throws RepositoryException {
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, workspace, null, callback);
    }

    protected NodeTypeRegistry nodeTypeRegistry() {
        return NodeTypeRegistry.getInstance();
    }

    /** One page of the snapshot query — a seam so unit tests can run the engine without a repository. */
    protected NodeIterator queryPage(JCRSessionWrapper session, String query, long offset, long limit)
            throws RepositoryException {
        Query sql2Query = session.getWorkspace().getQueryManager().createQuery(query, Query.JCR_SQL2);
        sql2Query.setLimit(limit);
        sql2Query.setOffset(offset);
        return sql2Query.execute().getNodes();
    }

    // === Operations ===

    @Override
    public boolean isNodeTypeRegistered(String nodeType) {
        return nodeTypeRegistry().hasNodeType(nodeType);
    }

    @Override
    public OperationReport forEachNode(Map<String, Object> selection, NodeVisitor visitor) throws RepositoryException {
        List<String> workspaces = stringListOption(selection, "workspaces", DEFAULT_WORKSPACES);
        int batchSize = intOption(selection, "batchSize", DEFAULT_BATCH_SIZE);
        boolean rawQuery = selection.get("query") != null;
        String query = rawQuery ? requiredOption(selection, "query") : buildQuery(selection);
        String primaryTypeOnly = rawQuery || boolOption(selection, "includeSubtypes", true)
                ? null
                : requiredOption(selection, "nodeType");

        Map<String, OperationReport.WorkspaceReport> byWorkspace = new LinkedHashMap<>();
        for (String workspace : workspaces) {
            // Snapshot the identifiers first: mutating nodes while paging through a live query result
            // (retyping, removing…) would make the pagination skip or repeat nodes.
            List<String> identifiers = withSystemSession(workspace, session -> {
                List<String> result = new ArrayList<>();
                for (long offset = 0; ; offset += SNAPSHOT_PAGE_SIZE) {
                    NodeIterator iterator = queryPage(session, query, offset, SNAPSHOT_PAGE_SIZE);
                    int pageCount = 0;
                    while (iterator.hasNext()) {
                        result.add(((JCRNodeWrapper) iterator.nextNode()).getIdentifier());
                        pageCount++;
                    }
                    if (pageCount < SNAPSHOT_PAGE_SIZE) {
                        break;
                    }
                }
                return result;
            });

            long matched = identifiers.size();
            long updated = 0;
            long skipped = 0;

            // Process in batches, one short-lived system session per batch. In dry-run mode the batch
            // is discarded (refresh(false)) instead of saved, so callbacks can mutate freely either way.
            for (int start = 0; start < identifiers.size(); start += batchSize) {
                List<String> batch = identifiers.subList(start, Math.min(start + batchSize, identifiers.size()));
                String primaryType = primaryTypeOnly;
                long[] counters = withSystemSession(workspace, session -> {
                    long batchUpdated = 0;
                    long batchSkipped = 0;
                    for (String identifier : batch) {
                        JCRNodeWrapper node;
                        try {
                            node = session.getNodeByIdentifier(identifier);
                        } catch (RepositoryException e) {
                            // Vanished since the snapshot (e.g. removed along with its parent) — fine.
                            batchSkipped++;
                            continue;
                        }
                        if (primaryType != null && !primaryType.equals(node.getPrimaryNodeTypeName())) {
                            batchSkipped++;
                            continue;
                        }
                        if (Boolean.FALSE.equals(visitor.visit(node))) {
                            batchSkipped++;
                        } else {
                            batchUpdated++;
                        }
                    }
                    if (dryRun) {
                        session.refresh(false);
                    } else {
                        session.save();
                    }
                    return new long[]{batchUpdated, batchSkipped};
                });
                updated += counters[0];
                skipped += counters[1];
                log.debug("{}: processed {}/{} nodes", workspace,
                        Math.min(start + batchSize, identifiers.size()), identifiers.size());
            }

            log.info("{}{}: {} matched, {} {}, {} skipped", dryRun ? "[dry-run] " : "", workspace,
                    matched, updated, dryRun ? "would be updated" : "updated", skipped);
            byWorkspace.put(workspace, new OperationReport.WorkspaceReport(matched, updated, skipped));
        }
        return new OperationReport(byWorkspace);
    }

    @Override
    public OperationReport removePropertyValues(Map<String, Object> options) throws RepositoryException {
        String property = requiredOption(options, "property");
        return guarded(requiredOption(options, "nodeType"), () -> forEachNode(options, node -> {
            boolean touched = false;
            if (node.hasProperty(property)) {
                node.getProperty(property).remove();
                touched = true;
            }
            for (Locale locale : node.getExistingLocales()) {
                Node translation = node.getI18N(locale);
                if (translation.hasProperty(property)) {
                    translation.getProperty(property).remove();
                    touched = true;
                }
            }
            return touched;
        }));
    }

    @Override
    public OperationReport setPropertyValues(Map<String, Object> options) throws RepositoryException {
        Object constant = options.get("value");
        if (constant == null) {
            throw new IllegalArgumentException(
                    "setPropertyValues requires a 'value' option (or a resolver callback for per-node values)");
        }
        return setPropertyValues(options, (node, locale) -> constant);
    }

    @Override
    public OperationReport setPropertyValues(Map<String, Object> options, PropertyValueResolver value)
            throws RepositoryException {
        String property = requiredOption(options, "property");
        boolean onlyIfMissing = boolOption(options, "onlyIfMissing", true);
        List<String> locales = stringListOption(options, "locales", null);
        return guarded(requiredOption(options, "nodeType"), () -> forEachNode(options, node -> {
            ExtendedPropertyDefinition definition = node.getApplicablePropertyDefinition(property);
            if (definition == null) {
                return false; // the type has no such property — nothing to set
            }
            if (definition.isMultiple()) {
                log.warn("Property {} is multi-valued, which setPropertyValues does not support — use forEachNode",
                        property);
                return false;
            }
            boolean touched = false;
            if (definition.isInternationalized()) {
                for (Locale locale : targetLocales(node, locales)) {
                    if (onlyIfMissing && node.hasI18N(locale) && node.getI18N(locale).hasProperty(property)) {
                        continue;
                    }
                    Object resolved = value.resolve(node, locale.toString());
                    // resolve the value before creating the translation subnode: a callback returning
                    // no value must not leave behind an empty (but persisted) translation node
                    if (resolved == null) {
                        continue;
                    }
                    setNodeProperty(node.getOrCreateI18N(locale), property, resolved);
                    touched = true;
                }
            } else {
                if (onlyIfMissing && node.hasProperty(property)) {
                    return false;
                }
                Object resolved = value.resolve(node, null);
                if (resolved == null) {
                    return false;
                }
                setNodeProperty(node, property, resolved);
                touched = true;
            }
            return touched;
        }));
    }

    @Override
    public OperationReport convertPropertyValues(Map<String, Object> options, PropertyValueConverter convert)
            throws RepositoryException {
        String property = requiredOption(options, "property");
        return guarded(requiredOption(options, "nodeType"), () -> forEachNode(options, node -> {
            boolean touched = convertOn(node, node, property, convert);
            for (Locale locale : node.getExistingLocales()) {
                touched = convertOn(node.getI18N(locale), node, property, convert) || touched;
            }
            return touched;
        }));
    }

    @Override
    public OperationReport removeNodeType(Map<String, Object> options) throws RepositoryException {
        String nodeType = requiredOption(options, "nodeType");
        String mode = stringOption(options, "ifContentExists", "fail");
        if (!"fail".equals(mode) && !"delete".equals(mode)) {
            throw new IllegalArgumentException(
                    "Invalid ifContentExists value '" + mode + "' — expected \"fail\" or \"delete\"");
        }
        return guarded(nodeType, () -> {
            // refuse foreign types BEFORE deleting anything — the check inside unregisterNodeType would
            // only fire after the batched content deletions have already been committed
            assertOwnedNodeType(nodeType);
            Map<String, Object> selection = new LinkedHashMap<>(options);
            selection.put("includeSubtypes", false);
            OperationReport report = forEachNode(selection, node -> {
                if ("fail".equals(mode)) {
                    throw new IllegalStateException("Cannot remove node type " + nodeType
                            + ": instances still exist (e.g. " + node.getPath() + "). "
                            + "Migrate or delete them first, or opt into deletion with ifContentExists: \"delete\".");
                }
                node.remove();
                return null;
            });
            unregisterNodeType(nodeType);
            if (!dryRun) {
                log.info("Node type {} unregistered", nodeType);
            }
            return report;
        });
    }

    @Override
    public OperationReport changeNodeType(Map<String, Object> options) throws RepositoryException {
        String from = requiredOption(options, "from");
        String to = requiredOption(options, "to");
        Map<String, String> mapProperties = stringMapOption(options, "mapProperties");
        boolean removeOldDefinition = boolOption(options, "removeOldDefinition", true);
        return guarded(from, () -> {
            // refuse foreign types BEFORE retyping anything (also covers removeOldDefinition: false,
            // where unregisterNodeType — and its own check — never runs)
            assertOwnedNodeType(from);
            if (!isNodeTypeRegistered(to)) {
                throw new IllegalStateException("Cannot rebind " + from + " to " + to
                        + ": the target type is not registered — is it declared in the module's current definitions?");
            }
            // per the documented contract, the target must also be a type this module owns
            assertOwnedNodeType(to);
            Map<String, Object> selection = new LinkedHashMap<>(options);
            selection.put("nodeType", from);
            selection.put("includeSubtypes", false);
            OperationReport report = forEachNode(selection, node -> {
                // Jahia's node wrapper does not implement setPrimaryType (it throws
                // UnsupportedRepositoryOperationException) — rebind on the underlying Jackrabbit node.
                Node realNode = node.getRealNode();
                // Jackrabbit validates EXISTING properties against the new type during setPrimaryType,
                // so mapped properties must be read + removed before the retype and written back (under
                // their new names, which only the new type defines) afterwards.
                List<CarriedProperty> carried = new ArrayList<>();
                for (Map.Entry<String, String> rename : mapProperties.entrySet()) {
                    if (!realNode.hasProperty(rename.getKey())) {
                        continue;
                    }
                    Property property = realNode.getProperty(rename.getKey());
                    carried.add(property.isMultiple()
                            ? new CarriedProperty(rename.getValue(), null, property.getValues())
                            : new CarriedProperty(rename.getValue(), property.getValue(), null));
                    property.remove();
                }
                realNode.setPrimaryType(to);
                for (CarriedProperty carriedProperty : carried) {
                    if (carriedProperty.values != null) {
                        realNode.setProperty(carriedProperty.name, carriedProperty.values);
                    } else {
                        realNode.setProperty(carriedProperty.name, carriedProperty.value);
                    }
                }
                // translation subnodes keep their own (residual-friendly) definitions — rename in place
                for (Map.Entry<String, String> rename : mapProperties.entrySet()) {
                    for (Locale locale : node.getExistingLocales()) {
                        renameOn(node.getI18N(locale), rename.getKey(), rename.getValue());
                    }
                }
                return null;
            });
            if (removeOldDefinition) {
                unregisterNodeType(from);
                if (!dryRun) {
                    log.info("Node type {} unregistered", from);
                }
            }
            return report;
        });
    }

    // === Definition guard rails ===

    /**
     * Asserts a node type is either absent or OWNED BY THE MODULE (same {@code systemId} as the
     * module id). Definition operations call this BEFORE mutating any content, so the refusal fires
     * before anything is deleted or retyped.
     *
     * @throws IllegalArgumentException if the type belongs to another module
     */
    protected void assertOwnedNodeType(String name) {
        if (!isNodeTypeRegistered(name)) {
            return; // fresh install: nothing registered, nothing to refuse
        }
        String owner = nodeTypeSystemId(name);
        if (owner != null && !moduleId.equals(owner)) {
            throw new IllegalArgumentException("Node type " + name + " is owned by '" + owner
                    + "', not by this module ('" + moduleId
                    + "') — content patches may only alter their own definitions");
        }
    }

    /** The {@code systemId} of a registered node type (its owning module), or null if it raced away. */
    protected String nodeTypeSystemId(String name) {
        try {
            return nodeTypeRegistry().getNodeType(name).getSystemId();
        } catch (NoSuchNodeTypeException e) {
            return null;
        }
    }

    /**
     * Unregisters a node type OWNED BY THE MODULE from the node type registry (dry-run aware).
     *
     * @throws IllegalArgumentException if the type belongs to another module
     * @throws IllegalStateException    if the registry refuses the removal (e.g. remaining usages)
     */
    protected void unregisterNodeType(String name) {
        NodeTypeRegistry registry = nodeTypeRegistry();
        if (!registry.hasNodeType(name)) {
            log.info("Node type {} is not registered on this instance, nothing to unregister", name);
            return;
        }
        assertOwnedNodeType(name);
        if (dryRun) {
            log.info("[dry-run] would unregister node type {}", name);
            return;
        }
        try {
            registry.unregisterNodeType(name);
        } catch (ConstraintViolationException e) {
            throw new IllegalStateException("Unable to unregister node type " + name + ": " + e.getMessage(), e);
        }
    }

    // === Internals ===

    /** One property carried across a retype: read + removed before, written back after. */
    private static final class CarriedProperty {
        final String name;
        final Value value;
        final Value[] values;

        CarriedProperty(String name, Value value, Value[] values) {
            this.name = name;
            this.value = value;
            this.values = values;
        }
    }

    @FunctionalInterface
    private interface Operation {
        OperationReport run() throws RepositoryException;
    }

    /** Fresh-install guard: an operation on a type that was never registered here is a graceful no-op. */
    private OperationReport guarded(String nodeType, Operation operation) throws RepositoryException {
        if (!isNodeTypeRegistered(nodeType)) {
            log.info("Node type {} is not registered on this instance (fresh install?) — nothing to do", nodeType);
            return OperationReport.empty();
        }
        return operation.run();
    }

    /** Converts the property on one node (or translation node); returns whether it was rewritten. */
    private boolean convertOn(Node owner, JCRNodeWrapper node, String propertyName, PropertyValueConverter convert)
            throws RepositoryException {
        if (!owner.hasProperty(propertyName)) {
            return false;
        }
        Property property = owner.getProperty(propertyName);
        if (property.isMultiple()) {
            log.warn("Property {} on {} is multi-valued, which convertPropertyValues does not support — use forEachNode",
                    propertyName, node.getPath());
            return false;
        }
        Object newValue = convert.convert(property.getValue(), node);
        if (newValue == null) {
            return false;
        }
        // Remove first: the stored value still carries the previous data type, and JCR refuses to
        // change the type of an existing property in place.
        property.remove();
        setNodeProperty(owner, propertyName, newValue);
        return true;
    }

    /** Renames a property on a node or translation node, preserving raw values (incl. multi-valued). */
    private static void renameOn(Node owner, String oldName, String newName) throws RepositoryException {
        if (!owner.hasProperty(oldName)) {
            return;
        }
        Property property = owner.getProperty(oldName);
        if (property.isMultiple()) {
            Value[] values = property.getValues();
            property.remove();
            owner.setProperty(newName, values);
        } else {
            Value value = property.getValue();
            property.remove();
            owner.setProperty(newName, value);
        }
    }

    /** The locales to write i18n values for: explicit option, else the resolved site's languages. */
    private static List<Locale> targetLocales(JCRNodeWrapper node, List<String> localeFilter)
            throws RepositoryException {
        List<Locale> siteLocales;
        try {
            siteLocales = node.getResolveSite().getLanguagesAsLocales();
        } catch (Exception e) {
            siteLocales = node.getExistingLocales();
        }
        if (localeFilter == null) {
            return siteLocales;
        }
        List<Locale> filtered = new ArrayList<>();
        for (Locale locale : siteLocales) {
            if (localeFilter.contains(locale.toString())) {
                filtered.add(locale);
            }
        }
        return filtered;
    }

    /**
     * Sets a property from a loosely-typed value: strings, booleans and numbers (from any of the
     * three languages), raw JCR values (carried across retypes/renames), nodes (references), dates.
     */
    private static void setNodeProperty(Node target, String name, Object value) throws RepositoryException {
        if (value instanceof Value) {
            target.setProperty(name, (Value) value);
        } else if (value instanceof Value[]) {
            target.setProperty(name, (Value[]) value);
        } else if (value instanceof String) {
            target.setProperty(name, (String) value);
        } else if (value instanceof Boolean) {
            target.setProperty(name, ((Boolean) value).booleanValue());
        } else if (value instanceof Integer || value instanceof Long || value instanceof Short
                || value instanceof Byte) {
            target.setProperty(name, ((Number) value).longValue());
        } else if (value instanceof Number) {
            target.setProperty(name, ((Number) value).doubleValue());
        } else if (value instanceof Node) {
            target.setProperty(name, (Node) value);
        } else if (value instanceof Calendar) {
            target.setProperty(name, (Calendar) value);
        } else if (value instanceof CharSequence) {
            // Groovy GStrings and other CharSequences store as strings
            target.setProperty(name, value.toString());
        } else {
            throw new IllegalArgumentException("Unsupported value of type " + value.getClass().getName()
                    + " for property " + name + " — supported: string, number, boolean, node, JCR value, date");
        }
    }

    private static String buildQuery(Map<String, Object> selection) {
        String nodeType = requiredOption(selection, "nodeType");
        List<String> clauses = new ArrayList<>();
        String scope = stringOption(selection, "scope", null);
        if (scope != null) {
            clauses.add("ISDESCENDANTNODE(n, '" + scope.replace("'", "''") + "')");
        }
        String where = stringOption(selection, "where", null);
        if (where != null) {
            clauses.add("(" + where + ")");
        }
        return "SELECT * FROM [" + nodeType + "] AS n"
                + (clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses));
    }

    // === Option readers — accept JVM types (Groovy/Java) and polyglot values (GraalJS) alike ===

    private static String requiredOption(Map<String, Object> options, String key) {
        String value = stringOption(options, key, null);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required option '" + key + "'");
        }
        return value;
    }

    private static String stringOption(Map<String, Object> options, String key, String fallback) {
        Object value = options.get(key);
        // toString covers Groovy GStrings along plain strings
        return value == null ? fallback : value.toString();
    }

    private static boolean boolOption(Map<String, Object> options, String key, boolean fallback) {
        Object value = options.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.parseBoolean(value.toString());
    }

    private static int intOption(Map<String, Object> options, String key, int fallback) {
        Object value = options.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private static List<String> stringListOption(Map<String, Object> options, String key, List<String> fallback) {
        Object value = options.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof List) {
            List<String> result = new ArrayList<>();
            for (Object item : (List<?>) value) {
                result.add(String.valueOf(item));
            }
            return result;
        }
        org.graalvm.polyglot.Value guest = org.graalvm.polyglot.Value.asValue(value);
        if (guest.hasArrayElements()) {
            List<String> result = new ArrayList<>();
            for (long i = 0; i < guest.getArraySize(); i++) {
                org.graalvm.polyglot.Value element = guest.getArrayElement(i);
                result.add(element.isString() ? element.asString() : String.valueOf(element.as(Object.class)));
            }
            return result;
        }
        throw new IllegalArgumentException("Option '" + key + "' must be a list of strings");
    }

    private static Map<String, String> stringMapOption(Map<String, Object> options, String key) {
        Object value = options.get(key);
        Map<String, String> result = new LinkedHashMap<>();
        if (value == null) {
            return result;
        }
        if (value instanceof Map) {
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                result.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
            }
            return result;
        }
        org.graalvm.polyglot.Value guest = org.graalvm.polyglot.Value.asValue(value);
        if (guest.hasMembers()) {
            for (String member : guest.getMemberKeys()) {
                org.graalvm.polyglot.Value memberValue = guest.getMember(member);
                result.put(member, memberValue.isString() ? memberValue.asString()
                        : String.valueOf(memberValue.as(Object.class)));
            }
            return result;
        }
        throw new IllegalArgumentException("Option '" + key + "' must be a map of strings to strings");
    }
}
