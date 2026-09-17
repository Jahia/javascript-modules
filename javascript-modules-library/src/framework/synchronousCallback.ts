/**
 * Rejects an `async` callback declared for an extension point that Jahia can invoke while
 * JavaScript is already running: a render reached through the `<Render>` component, or a save
 * triggered from server code. GraalJS only drains the microtask queue when the outermost JavaScript
 * frame returns to the host, so a promise created by such a nested invocation never settles and the
 * render or the save fails. Refusing the callback at registration turns a failure that depends on
 * the call path into one that happens every time the module starts.
 *
 * Detection reads the function's type tag, which assumes the module bundle keeps native `async`
 * functions. A bundle that downlevels them falls back to the engine's never-settled error.
 *
 * @param callback The registered callback; anything that is not a function is left to the caller.
 * @param what How to name the callback in the error message.
 */
export const assertSynchronousCallback = (callback: unknown, what: string): void => {
  const tag = Object.prototype.toString.call(callback);
  if (tag === "[object AsyncFunction]" || tag === "[object AsyncGeneratorFunction]") {
    throw new TypeError(
      `${what} must be a synchronous function: it can run inside another JavaScript execution, ` +
        `where the server runtime cannot settle a promise.`,
    );
  }
};
