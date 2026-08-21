package org.jahia.modules.javascript.modules.engine.contentpatches;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Outcome of a bulk {@link ContentPatchOperations content patch operation}: how many nodes the
 * selection matched, how many were actually modified, and how many were left untouched (already up
 * to date, vanished mid-run, …) — in total and per processed workspace.
 */
public final class OperationReport {

    /** The counters of one workspace. */
    public static final class WorkspaceReport {
        private final long matched;
        private final long updated;
        private final long skipped;

        public WorkspaceReport(long matched, long updated, long skipped) {
            this.matched = matched;
            this.updated = updated;
            this.skipped = skipped;
        }

        public long getMatched() {
            return matched;
        }

        public long getUpdated() {
            return updated;
        }

        public long getSkipped() {
            return skipped;
        }
    }

    private final Map<String, WorkspaceReport> byWorkspace;

    /** @param byWorkspace per-workspace counters, in processing order */
    public OperationReport(Map<String, WorkspaceReport> byWorkspace) {
        this.byWorkspace = Collections.unmodifiableMap(new LinkedHashMap<>(byWorkspace));
    }

    /** A report with no processed workspace — what a fresh-install no-op returns. */
    public static OperationReport empty() {
        return new OperationReport(Collections.emptyMap());
    }

    /** Nodes matched by the selection, across all processed workspaces. */
    public long getMatched() {
        return byWorkspace.values().stream().mapToLong(WorkspaceReport::getMatched).sum();
    }

    /** Nodes actually modified, across all processed workspaces. */
    public long getUpdated() {
        return byWorkspace.values().stream().mapToLong(WorkspaceReport::getUpdated).sum();
    }

    /** Nodes matched but left untouched, across all processed workspaces. */
    public long getSkipped() {
        return byWorkspace.values().stream().mapToLong(WorkspaceReport::getSkipped).sum();
    }

    /** The per-workspace counters, in processing order. */
    public Map<String, WorkspaceReport> getByWorkspace() {
        return byWorkspace;
    }

    /** The processed workspace names, in processing order (list-shaped for JS interop). */
    public List<String> getWorkspaceNames() {
        return new ArrayList<>(byWorkspace.keySet());
    }

    /** The counters of one workspace, or null if it was not processed. */
    public WorkspaceReport getWorkspace(String name) {
        return byWorkspace.get(name);
    }

    @Override
    public String toString() {
        return "OperationReport[matched=" + getMatched() + ", updated=" + getUpdated() + ", skipped=" + getSkipped() + "]";
    }
}
