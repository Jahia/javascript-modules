// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import { addNode, createSite, deleteSite, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../utils/Utils";
import { siteKey } from "../e2e/hydrogen-tutorial/data";

require("cypress-terminal-report/src/installLogsCollector")({
  xhr: {
    printHeaderData: true,
    printRequestData: true,
  },
  enableExtendedCollector: true,
  collectTypes: [
    "cons:log",
    "cons:info",
    "cons:warn",
    "cons:error",
    "cy:log",
    "cy:xhr",
    "cy:request",
    "cy:intercept",
    "cy:command",
  ],
});
require("@jahia/cypress/dist/support/registerSupport").registerSupport();
Cypress.on("uncaught:exception", () => {
  // Returning false here prevents Cypress from
  // failing the test
  return false;
});

before("Create test site", () => {
  createSite("javascriptTestSite", {
    languages: "en",
    templateSet: "javascript-modules-engine-test-module",
    locale: "en",
    serverName: "localhost",
  });

  addSimplePage("/sites/javascriptTestSite/home", "testPage", "testPage", "en", "simple", [
    {
      name: "pagecontent",
      primaryNodeType: "jnt:contentList",
    },
  ]).then(() => {
    addNode({
      parentPathOrId: "/sites/javascriptTestSite/home/testPage/pagecontent",
      name: "test",
      primaryNodeType: "javascriptExample:test",
      properties: [
        { name: "jcr:title", value: "test component" },
        { name: "prop1", value: "prop1 value" },
        { name: "propMultiple", values: ["value 1", "value 2", "value 3"] },
        {
          name: "propRichText",
          value: '<p data-testid="propRichTextValue">Hello this is a sample rich text</p>',
        },
      ],
    });
  });
});

before("Create tutorial sample site", () => {
  cy.log("Creating sample site " + siteKey + "...");
  cy.log("Cypress env variables", Cypress.env());
  const prepackaged_site_URL = Cypress.env("PREPACKAGED_SITE_URL");
  cy.log("Cypress prepackaged site URL", prepackaged_site_URL);
  if (prepackaged_site_URL && prepackaged_site_URL.startsWith("jar:mvn:")) {
    // the prepackaged site should be fetched from a Maven URL
    cy.runProvisioningScript({
      fileContent: `- importSite: "${prepackaged_site_URL}"`,
      type: "application/yaml",
    }).then(() => publishAndWaitJobEnding(`/sites/${siteKey}`, ["en"]));
  } else {
    // otherwise, assume it's a glob filename related to the ./artifacts/ folder
    cy.log(`Unzipping ${prepackaged_site_URL}...`);
    const prepackaged_archive_path = "META-INF/prepackagedSites/hydrogen-prepackaged.zip";
    cy.task("unzipArtifact", {
      artifactFilename: prepackaged_site_URL,
      filteredPath: prepackaged_archive_path,
    })
      .then(() => {
        cy.log(`Extracting site.zip from  ${prepackaged_archive_path}...`);
        return cy.task("unzipArtifact", {
          artifactFilename: prepackaged_archive_path,
          filteredPath: "site.zip",
        });
      })
      .then(() => {
        cy.log("Importing site.zip...");
        const site_archive_path = "../../artifacts/site.zip";
        return cy.runProvisioningScript(
          {
            fileContent: `- importSite: "${site_archive_path}"`,
            type: "application/yaml",
          },
          [{ fileName: site_archive_path }],
        );
      })
      .then(() => {
        cy.log(`Publishing site '${siteKey}'...`);
        publishAndWaitJobEnding(`/sites/${siteKey}`, ["en"]);
      });
  }
});

after("Clean", () => {
  cy.visit("/start", { failOnStatusCode: false });
  deleteSite("javascriptTestSite");
  cy.logout();
});

after("Clean tutorial sample site", () => {
  // Delete the tutorial sample site
  deleteSite(siteKey);
});
