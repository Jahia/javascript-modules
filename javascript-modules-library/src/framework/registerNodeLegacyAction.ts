import type { JCRSessionWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource, URLResolver } from "org.jahia.services.render";
import type { HttpServletRequest } from "javax.servlet.http";
import type { List, Map as JavaMap } from "java.util";

/** Declaration of an action, invoked through `<nodeUrl>.<name>.do` URLs. */
export interface NodeLegacyActionDeclaration {
  /**
   * The action name; the action is triggered by URLs of the form `<nodeUrl>.<name>.do`.
   *
   * Names live in a single platform-wide namespace shared with Java modules (last registration
   * wins); prefix them with your module name to avoid collisions.
   */
  name: string;
  /**
   * HTTP methods allowed to trigger the action. When omitted, Jahia's default applies (GET and
   * POST). Note that POST/PUT/DELETE requests to `.do` URLs must be whitelisted in Jahia's CSRF
   * guard configuration — see the actions documentation.
   */
  requiredMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  /**
   * Restrict the action to authenticated users.
   *
   * @default true (Jahia's default — set it to false explicitly for guest-accessible actions)
   */
  requireAuthenticatedUser?: boolean;
  /** Permission required on the target node to execute the action, e.g. `"jcr:write"`. */
  requiredPermission?: string;
  /** Restrict the action to a workspace. */
  requiredWorkspace?: "default" | "live";
}

/** Context passed to an action handler. */
export interface NodeLegacyActionContext {
  /** Merged query-string and form parameters of the request. */
  parameters: Record<string, string[]>;
  /** The render context of the action request. */
  renderContext: RenderContext;
  /** The resource targeted by the action URL. */
  resource: Resource;
  /** The JCR session of the calling user. */
  session: JCRSessionWrapper;
  /** Escape hatch: the raw servlet request (headers, cookies, body). */
  request: HttpServletRequest;
  /** Escape hatch: the Jahia URL resolver for the action URL. */
  urlResolver: URLResolver;
}

/** Result of an action handler. */
export interface NodeLegacyActionResult {
  /** HTTP status code of the response. @default 200 */
  statusCode?: number;
  /** Serialized as the JSON response body. Must be a JSON object at the top level. */
  json?: Record<string, unknown>;
  /** URL to redirect the client to. */
  redirect?: string;
  /** Whether `redirect` is an absolute URL. @default false */
  absoluteRedirect?: boolean;
}

/**
 * Registers a legacy node action: an HTTP endpoint bound to a content node, invoked through
 * `<nodeUrl>.<name>.do` URLs — Jahia's classic `org.jahia.bin.Action` mechanism, exposed for parity
 * with Java modules.
 *
 * To call server code from client components (islands), prefer actions declared in `.action.ts`
 * files: typed, client-callable functions with automatic serialization.
 *
 * ```ts
 * registerNodeLegacyAction(
 *   { name: "myModuleGreet", requiredMethods: ["GET"] },
 *   ({ parameters, resource }) => ({
 *     json: {
 *       greeting: `Hello ${parameters.who?.[0] ?? "world"}`,
 *       path: resource.getNode().getPath(),
 *     },
 *   }),
 * );
 * ```
 *
 * Handlers may be `async`: `await` over synchronous work is fully supported, but the server runtime
 * has no timers and no asynchronous I/O — a promise relying on them never settles and the request
 * fails.
 *
 * @param declaration The action declaration; `name` is the URL-visible action name.
 * @param handler Executes the action and returns the response to send.
 */
export const registerNodeLegacyAction = (
  {
    name,
    requiredMethods,
    requireAuthenticatedUser,
    requiredPermission,
    requiredWorkspace,
  }: NodeLegacyActionDeclaration,
  handler: (
    context: NodeLegacyActionContext,
  ) => NodeLegacyActionResult | undefined | Promise<NodeLegacyActionResult | undefined>,
): void => {
  server.registry.add("node-legacy-action", name, {
    ...(requiredMethods !== undefined && { requiredMethods: requiredMethods.join(",") }),
    ...(requireAuthenticatedUser !== undefined && { requireAuthenticatedUser }),
    ...(requiredPermission !== undefined && { requiredPermission }),
    ...(requiredWorkspace !== undefined && { requiredWorkspace }),
    // Raw adapter invoked by the Java bridge (NodeLegacyActionRegistrar.ActionBridge) with the
    // Action#doExecute arguments; resolves to {statusCode, json?: string, redirect?,
    // absoluteRedirect?} with json pre-stringified (the bridge settles the promise). Keep both
    // shapes in sync.
    doExecute: (
      request: HttpServletRequest,
      renderContext: RenderContext,
      resource: Resource,
      session: JCRSessionWrapper,
      javaParameters: JavaMap<string, List<string>>,
      urlResolver: URLResolver,
    ) =>
      Promise.resolve(
        handler({
          parameters: toJsParameters(javaParameters),
          renderContext,
          resource,
          session,
          request,
          urlResolver,
        }),
      ).then((result) => {
        if (!result) return { statusCode: 200 };
        return {
          statusCode: result.statusCode ?? 200,
          ...(result.json !== undefined && { json: JSON.stringify(result.json) }),
          ...(result.redirect !== undefined && {
            redirect: result.redirect,
            absoluteRedirect: result.absoluteRedirect ?? false,
          }),
        };
      }),
  });
  console.debug(`Registered node legacy action: ${name}`);
};

/** Converts the Java Map<String, List<String>> of request parameters into a plain JS object. */
const toJsParameters = (
  javaParameters: JavaMap<string, List<string>>,
): Record<string, string[]> => {
  const parameters: Record<string, string[]> = {};
  if (javaParameters) {
    // keySet() is not part of the generated Map typing but is available at runtime
    const keys = (javaParameters as unknown as { keySet(): { iterator(): Iterator<string> } })
      .keySet()
      .iterator();
    while (keys.hasNext()) {
      const key = keys.next();
      const values = javaParameters.get(key);
      const jsValues: string[] = [];
      if (values) {
        for (let i = 0; i < values.size(); i++) {
          jsValues.push(values.get(i));
        }
      }
      parameters[key] = jsValues;
    }
  }
  return parameters;
};

/** Minimal typing of a java.util.Iterator, which is not part of the generated Map typing. */
interface Iterator<T> {
  hasNext(): boolean;
  next(): T;
}
