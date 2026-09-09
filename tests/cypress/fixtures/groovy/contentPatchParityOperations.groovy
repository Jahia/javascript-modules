import org.jahia.osgi.BundleUtils

// The Groovy face of the content patch operations: the SAME engine the TypeScript patch.* helpers
// delegate to, obtained dynamically so the script needs no compile-time dependency on the engine
// bundle. This mirrors, operation by operation, the JS patches 02-06 of
// jahia-test-module/src/react/server/extensions/contentPatches.ts — on the patchTestGroovy* types.
def ops = BundleUtils.getOsgiService(
        "org.jahia.modules.javascript.modules.engine.contentpatches.ContentPatchService", null)
        .operations("javascript-modules-engine-test-module", false, null)

// U1 — remove leftover legacyColor values (JS: 1.0.0-02-remove-legacy-color)
ops.removePropertyValues(nodeType: "javascriptExample:patchTestGroovyContent", property: "legacyColor")

// U2 — backfill the theme property on existing content (JS: 1.0.0-03-backfill-theme)
ops.setPropertyValues(nodeType: "javascriptExample:patchTestGroovyContent", property: "theme", value: "light")

// U3 — convert counter values from string to number (JS: 1.0.0-04-convert-counter)
ops.convertPropertyValues(nodeType: "javascriptExample:patchTestGroovyContent", property: "counter") { value, node ->
    Integer.parseInt(value.getString())
}

// U5 — rebind patchTestGroovyLegacy to patchTestGroovyNew, renaming oldTitle (JS: 1.0.0-05-rename-legacy-type)
ops.changeNodeType(from: "javascriptExample:patchTestGroovyLegacy", to: "javascriptExample:patchTestGroovyNew",
        mapProperties: [oldTitle: "newTitle"], removeOldDefinition: false)

// U4 — purge patchTestGroovyDoomed instances and unregister the type (JS: 1.0.0-06-remove-doomed-type)
def report = ops.removeNodeType(nodeType: "javascriptExample:patchTestGroovyDoomed", ifContentExists: "delete")

setResult("applied (doomed: ${report.matched} matched, ${report.updated} updated)")
