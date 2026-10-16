package org.jahia.modules.javascript.modules.engine.contentpatches;

import java.util.Map;

import javax.jcr.RepositoryException;

/**
 * Guard-railed content patch operations: bulk, batched, i18n-aware content transformations used to
 * reconcile existing content with definition changes. One implementation serves every language —
 * JavaScript content patches call it through the {@code registerContentPatch} context, Groovy and
 * Java callers obtain it from the {@link ContentPatchService} OSGi service.
 *
 * <p>Every operation iterates the {@code default} and {@code live} workspaces (override with
 * {@code workspaces}), commits in batches ({@code batchSize}, default 100), logs progress, no-ops
 * gracefully when the node type was never registered on this instance (fresh installs), and honors
 * dry-run mode (changes are logged and discarded instead of saved).
 *
 * <p>Options are passed as a plain {@code Map} — an object literal from JavaScript, named arguments
 * from Groovy ({@code ops.removePropertyValues(nodeType: "mymod:banner", property: "color")}).
 * <b>Node selection keys</b>, common to all bulk operations:
 *
 * <ul>
 * <li>{@code nodeType} (required) — node type whose instances to process;</li>
 * <li>{@code includeSubtypes} — whether instances of subtypes are processed too (default
 * true);</li>
 * <li>{@code scope} — limit the selection to a subtree, e.g. {@code "/sites/acme"} (default: the
 * whole workspace);</li>
 * <li>{@code where} — optional JCR-SQL2 constraint appended to the generated query, e.g.
 * {@code "[price] > 1000"};</li>
 * <li>{@code workspaces} — list of workspaces to process (default
 * {@code ["default", "live"]});</li>
 * <li>{@code batchSize} — nodes per save/refresh cycle (default 100).</li>
 * </ul>
 */
public interface ContentPatchOperations {

    /**
     * Whether a node type is currently registered on this instance — the fresh-install guard: an
     * instance installed directly at the latest module version may never have seen legacy types.
     */
    boolean isNodeTypeRegistered(String nodeType);

    /**
     * The batching engine behind every bulk operation: snapshots the identifiers of the selected
     * nodes, then visits them in batches, committing ({@code session.save()}) after each batch — or
     * discarding the batch in dry-run mode.
     *
     * <p>Selection: either the node selection keys (see class javadoc), or {@code query} — a full
     * JCR-SQL2 query replacing the generated one ({@code workspaces} and {@code batchSize} still
     * apply).
     *
     * @param selection node selection options
     * @param visitor   called once per selected node; return {@link Boolean#FALSE} to count the
     *                  node as skipped instead of updated
     * @return per-workspace counters of the iteration
     */
    OperationReport forEachNode(Map<String, Object> selection, NodeVisitor visitor) throws RepositoryException;

    /**
     * Removes leftover values of a property (i18n-aware) on all instances of a node type — the
     * cleanup after a property was dropped from the definitions.
     *
     * <p>Options: the node selection keys, plus {@code property} (required) — the property whose
     * values to remove, including on translation subnodes.
     */
    OperationReport removePropertyValues(Map<String, Object> options) throws RepositoryException;

    /**
     * Sets a constant property value on existing content, e.g. to backfill a newly added property.
     *
     * <p>Options: the node selection keys, plus:
     *
     * <ul>
     * <li>{@code property} (required) — the property to set;</li>
     * <li>{@code value} (required) — the value to set: string, number, boolean, {@code Node} or raw
     * JCR {@code Value} (for a per-node value, use the {@link #setPropertyValues(Map,
     * PropertyValueResolver) resolver variant});</li>
     * <li>{@code onlyIfMissing} — never overwrite an existing value (default true);</li>
     * <li>{@code locales} — for an internationalized property: the language codes to process
     * (default: the resolved site's languages).</li>
     * </ul>
     */
    OperationReport setPropertyValues(Map<String, Object> options) throws RepositoryException;

    /**
     * Sets a per-node property value on existing content: same contract as
     * {@link #setPropertyValues(Map)} minus the {@code value} key, with the value computed by the
     * resolver — for an internationalized property, once per target locale.
     */
    OperationReport setPropertyValues(Map<String, Object> options, PropertyValueResolver value) throws RepositoryException;

    /**
     * Rewrites the values of a property after its data type changed in the definitions.
     *
     * <p>Options: the node selection keys, plus {@code property} (required) — the property whose
     * values to convert, including on translation subnodes. The converter receives each stored
     * value (which may still carry the previous data type); returning null leaves that value
     * untouched.
     */
    OperationReport convertPropertyValues(Map<String, Object> options, PropertyValueConverter convert) throws RepositoryException;

    /**
     * Removes a node type OWNED BY THE MODULE from the registry, optionally purging its instances.
     *
     * <p>Options:
     *
     * <ul>
     * <li>{@code nodeType} (required) — the node type to remove; it must be owned by the module
     * this operations instance is bound to;</li>
     * <li>{@code ifContentExists} — {@code "fail"} (default): the operation fails, and content is
     * left untouched, if instances still exist; {@code "delete"}: purge the instances first —
     * destroying content is opt-in;</li>
     * <li>{@code workspaces}, {@code batchSize} — as in the node selection keys.</li>
     * </ul>
     */
    OperationReport removeNodeType(Map<String, Object> options) throws RepositoryException;

    /**
     * Rebinds all instances of a node type to another type (typically after a rename), then removes
     * the old definition.
     *
     * <p>Options: the node selection keys minus {@code nodeType}/{@code includeSubtypes}, plus:
     *
     * <ul>
     * <li>{@code from} (required) — the old node type; must be owned by the module;</li>
     * <li>{@code to} (required) — the new node type; must be registered (declared in the module's
     * current definitions) and owned by the module;</li>
     * <li>{@code mapProperties} — property renames to apply on each rebound node (i18n-aware), as a
     * map of {@code oldName} to {@code newName};</li>
     * <li>{@code removeOldDefinition} — unregister the {@code from} definition once all instances
     * are rebound (default true).</li>
     * </ul>
     */
    OperationReport changeNodeType(Map<String, Object> options) throws RepositoryException;
}
