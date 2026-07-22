import type {
  JCRCallback,
  JCRNodeWrapper,
  JCRSessionWrapper,
} from "org.jahia.services.content";
import type {
  MigrationJcr,
  MigrationLogger,
  MigrationOperationReport,
  NodeSelection,
  QuerySelection,
} from "./types.js";

/** Page size used when snapshotting the identifiers of the nodes to process. */
const SNAPSHOT_PAGE_SIZE = 1000;

/** Thrown by `context.skip()`; caught by the `execute` adapter to record `.skipped`. */
export class MigrationSkipped extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "MigrationSkipped";
  }
}

const escapeSql2Literal = (value: string) => value.replace(/'/g, "''");

const buildQuery = (options: NodeSelection): string => {
  const clauses: string[] = [];
  if (options.scope) {
    clauses.push(`ISDESCENDANTNODE(n, '${escapeSql2Literal(options.scope)}')`);
  }
  if (options.where) {
    clauses.push(`(${options.where})`);
  }
  return `SELECT * FROM [${options.nodeType}] AS n${
    clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : ""
  }`;
};

/** Builds the `jcr` part of the migration context. */
export const createMigrationJcr = (dryRun: boolean, log: MigrationLogger): MigrationJcr => {
  const withSystemSession = <T>(
    { workspace = "default", locale = null }: { workspace?: "default" | "live"; locale?: string | null },
    callback: (session: JCRSessionWrapper) => T,
  ): T =>
    server.jcr.doExecuteAsSystem(
      ((session: JCRSessionWrapper) => callback(session)) as unknown as JCRCallback<unknown>,
      // the Java side accepts null (non-localized session) but the generated type says string
      locale as unknown as string,
      workspace,
    ) as T;

  const forEachNode = (
    options: NodeSelection | QuerySelection,
    callback: (node: JCRNodeWrapper) => boolean | void,
  ): MigrationOperationReport => {
    const workspaces = options.workspaces ?? ["default", "live"];
    const batchSize = options.batchSize ?? 100;
    const query = "query" in options ? options.query : buildQuery(options);
    const primaryTypeOnly =
      "query" in options || (options.includeSubtypes ?? true) ? null : options.nodeType;

    const report: MigrationOperationReport = { matched: 0, updated: 0, skipped: 0, byWorkspace: {} };

    for (const workspace of workspaces) {
      const counters = { matched: 0, updated: 0, skipped: 0 };
      report.byWorkspace[workspace] = counters;

      // Snapshot the identifiers first: mutating nodes while paging through a live query result
      // (retyping, removing…) would make the pagination skip or repeat nodes.
      const identifiers = withSystemSession({ workspace }, (session) => {
        const result: string[] = [];
        for (let offset = 0; ; offset += SNAPSHOT_PAGE_SIZE) {
          const sql2Query = session
            .getWorkspace()
            .getQueryManager()
            .createQuery(query, "JCR-SQL2");
          sql2Query.setLimit(SNAPSHOT_PAGE_SIZE);
          sql2Query.setOffset(offset);
          const iterator = sql2Query.execute().getNodes();
          let pageCount = 0;
          while (iterator.hasNext()) {
            result.push((iterator.nextNode() as JCRNodeWrapper).getIdentifier());
            pageCount++;
          }
          if (pageCount < SNAPSHOT_PAGE_SIZE) break;
        }
        return result;
      });
      counters.matched = identifiers.length;

      // Process in batches, one short-lived system session per batch. In dry-run mode the batch is
      // discarded (refresh(false)) instead of saved, so callbacks can mutate freely either way.
      for (let start = 0; start < identifiers.length; start += batchSize) {
        const batch = identifiers.slice(start, start + batchSize);
        withSystemSession({ workspace }, (session) => {
          for (const identifier of batch) {
            let node: JCRNodeWrapper;
            try {
              node = session.getNodeByIdentifier(identifier);
            } catch {
              // Vanished since the snapshot (e.g. removed along with its parent) — fine.
              counters.skipped++;
              continue;
            }
            if (primaryTypeOnly !== null && node.getPrimaryNodeTypeName() !== primaryTypeOnly) {
              counters.skipped++;
              continue;
            }
            if (callback(node) === false) {
              counters.skipped++;
            } else {
              counters.updated++;
            }
          }
          if (dryRun) {
            session.refresh(false);
          } else {
            session.save();
          }
        });
        log.debug(
          `${workspace}: processed ${Math.min(start + batchSize, identifiers.length)}/${identifiers.length} nodes`,
        );
      }

      log.info(
        `${dryRun ? "[dry-run] " : ""}${workspace}: ${counters.matched} matched, ${counters.updated} ${
          dryRun ? "would be updated" : "updated"
        }, ${counters.skipped} skipped`,
      );
      report.matched += counters.matched;
      report.updated += counters.updated;
      report.skipped += counters.skipped;
    }

    return report;
  };

  return { withSystemSession, forEachNode };
};
