import { createMigrationJcr, MigrationSkipped } from "./jcr.js";
import { createMigrationOperations } from "./operations.js";
import type { JavaMigrationSupport, MigrationContext, MigrationDeclaration } from "./types.js";

/**
 * `registerMigration` calls are executed synchronously during module initialization. During this
 * time, `bundleKey` is set to the symbolic name of the active bundle.
 */
declare const bundleKey: string;

const RECOMMENDED_NAME_PATTERN = /^\d+\.\d+\.\d+-\d{2,}-[A-Za-z0-9._-]+$/;

/**
 * Registers a migration: a run-once script executed on the processing server when a new version of
 * this module starts, used to reconcile existing content with definition changes (the JavaScript
 * equivalent of Jahia's Groovy `META-INF/patches` scripts).
 *
 * ```ts
 * registerMigration({ name: "2.0.0-01-remove-legacy-color" }, ({ migrate }) => {
 *   migrate.removePropertyValues({ nodeType: "mymodule:banner", property: "color" });
 * });
 * ```
 *
 * Execution is tracked in Jahia's module patch status store, keyed by `name`: whatever the outcome
 * (`.installed`, `.skipped`, `.failed`), a recorded migration never runs again. A module's
 * migrations run in lexicographic order of their names; on failure the module still starts, but its
 * remaining migrations are halted (they stay pending).
 *
 * Migrations run synchronously on the module start thread and must NOT be async — keep heavy work
 * bounded through the built-in batching of the `migrate.*` helpers and `jcr.forEachNode`.
 *
 * @param declaration The migration declaration; `name` is its run-once identity and ordering key.
 * @param run Performs the migration. Returning normally records `.installed`; throwing records
 *   `.failed`; calling `context.skip(reason)` records `.skipped`.
 */
export const registerMigration = (
  { name, description }: MigrationDeclaration,
  run: (context: MigrationContext) => void,
): void => {
  if (!name || !/^\S+$/.test(name)) {
    throw new Error(
      `Invalid migration name "${name}": the name is the migration's run-once identity and must be a non-empty string without whitespace`,
    );
  }
  if (!RECOMMENDED_NAME_PATTERN.test(name)) {
    console.debug(
      `Migration name "${name}" does not follow the recommended "<moduleVersion>-<NN>-<slug>" convention (e.g. "2.0.0-01-remove-legacy-color"); note that migrations run in lexicographic name order`,
    );
  }
  const key = `${bundleKey}_migration_${name}`;
  if (server.registry.get("migration", key)) {
    throw new Error(
      `Duplicate migration name "${name}": another migration with the same name is already registered in this module`,
    );
  }
  server.registry.add("migration", key, {
    name,
    description: description ?? "",
    // Raw adapter invoked by the Java MigrationRegistrar with a MigrationSupport object. It returns
    // the result string to record; throwing records `.failed`. Keep both shapes in sync.
    execute: (support: JavaMigrationSupport) => {
      const log = support.getLogger(name);
      const dryRun = support.isDryRun();
      const jcr = createMigrationJcr(dryRun, log);
      const context: MigrationContext = {
        jcr,
        migrate: createMigrationOperations(jcr, support, log),
        log,
        dryRun,
        module: { name: support.getModuleName(), version: support.getModuleVersion() },
        skip: (reason) => {
          throw new MigrationSkipped(reason);
        },
      };
      if (description) log.info(description);
      try {
        const result = run(context) as unknown;
        if (result && typeof (result as PromiseLike<unknown>).then === "function") {
          throw new Error(
            `Migration ${name} returned a promise: migrations must be synchronous (do not use an async run function)`,
          );
        }
        return ".installed";
      } catch (error) {
        if (error instanceof MigrationSkipped) {
          log.info(`Migration skipped: ${error.reason}`);
          return ".skipped";
        }
        throw error;
      }
    },
  });
  console.debug(`Registered migration ${name}`);
};
