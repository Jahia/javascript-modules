/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************
const unzipping = require("./unzipping");

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
/** @type {Cypress.PluginConfig} */
module.exports = (on, config) => {
  require("./env")(on, config);
  require("@jahia/cypress/dist/plugins/registerPlugins").registerPlugins(on, config);
  require("cypress-terminal-report/src/installLogsPrinter")(on, {
    printLogsToConsole: "onFail",
    printLogsToFile: "always",
    outputRoot: config.projectRoot + "/results/",
    // Used to trim the base path of specs and reduce nesting in the generated output directory.
    specRoot: "cypress/e2e",
    outputTarget: {
      "cypress-logs|txt": "txt",
    },
    defaultTrimLength: 50000,
    commandTrimLength: 5000,
    routeTrimLength: 5000,
  });
  on("task", {
    unzipArtifact: unzipping.unzipArtifact,
  });
  return config;
};
