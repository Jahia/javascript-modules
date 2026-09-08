import type { Plugin } from "vite";

/**
 * List of environments still being built.
 *
 * This variable is in the global scope and shared between all instances of the plugin. This is
 * because Vite intentionally creates a new instance of each plugin for each environment when
 * running in multi-environment mode, to avoid breaking legacy plugins.
 */
const building = new Set<string>();

/**
 * Plugin to execute a callback when a build succeeds.
 *
 * It tracks the completion of builds in watch mode.
 *
 * The callback is skipped under `jahia dev`, which runs this very build and then pushes its output
 * into a running Jahia itself. Leaving the module's callback to reinstall the module on every save
 * would put back the round trip that loop exists to remove.
 */
export function buildSuccessful(callback: () => void | Promise<void>): Plugin {
  return {
    name: "build-successful-callback",
    buildStart() {
      building.add(this.environment.name);
    },
    async closeBundle(error) {
      if (error) return;
      building.delete(this.environment.name);
      if (building.size === 0 && !process.env.JAHIA_DEV) await callback();
    },
  };
}
