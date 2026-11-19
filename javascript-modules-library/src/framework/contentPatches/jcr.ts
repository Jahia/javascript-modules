import type { JCRCallback, JCRSessionWrapper } from "org.jahia.services.content";
import type {
  ContentPatchJcr,
  ContentPatchOperationReport,
  JavaContentPatchOperations,
  JavaOperationReport,
} from "./types.js";

/** Thrown by `context.skip()`; caught by the `execute` adapter to record `.skipped`. */
export class ContentPatchSkipped extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "ContentPatchSkipped";
  }
}

/** Iterates a Java List through its size()/get() members (safe under GraalVM interop). */
export const listToArray = <T>(list: { size(): number; get(index: number): unknown }): T[] => {
  const result: T[] = [];
  for (let i = 0; i < list.size(); i++) {
    result.push(list.get(i) as T);
  }
  return result;
};

/** Converts a Java operation report to the plain-object shape of the public contract. */
export const toReport = (report: JavaOperationReport): ContentPatchOperationReport => ({
  matched: report.getMatched(),
  updated: report.getUpdated(),
  skipped: report.getSkipped(),
  byWorkspace: Object.fromEntries(
    listToArray<string>(report.getWorkspaceNames()).map((workspace) => {
      const counters = report.getWorkspace(workspace);
      return [
        workspace,
        {
          matched: counters.getMatched(),
          updated: counters.getUpdated(),
          skipped: counters.getSkipped(),
        },
      ];
    }),
  ),
});

/** Builds the `jcr` part of the content patch context — a façade over the Java operations engine. */
export const createContentPatchJcr = (ops: JavaContentPatchOperations): ContentPatchJcr => {
  const withSystemSession = <T>(
    {
      workspace = "default",
      locale = null,
    }: { workspace?: "default" | "live"; locale?: string | null },
    callback: (session: JCRSessionWrapper) => T,
  ): T =>
    server.jcr.doExecuteAsSystem(
      ((session: JCRSessionWrapper) => callback(session)) as unknown as JCRCallback<unknown>,
      // the Java side accepts null (non-localized session) but the generated type says string
      locale as unknown as string,
      workspace,
    ) as T;

  const forEachNode: ContentPatchJcr["forEachNode"] = (options, callback) =>
    toReport(ops.forEachNode(options, callback));

  return { withSystemSession, forEachNode };
};
