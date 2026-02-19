import {
  addNode,
  createSite,
  deleteSite,
  enableModule,
  publishAndWaitJobEnding,
} from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";

const testData = {
  translations: {
    en: {
      simple: "Hello !",
      composed: "This is a composed string: {{placeholder}}",
    },
    fr: {
      simple: "Salut !",
      composed: "Ceci est un test composé: {{placeholder}}",
    },
    fr_LU: {
      simple: "Salut !",
      composed: "Ceci est un test composé: {{placeholder}}",
    },
    de: {
      simple: "Hallo !",
      composed: "Dies ist eine zusammengesetzte Zeichenfolge: {{placeholder}}",
    },
  },
};

describe("Test i18n", () => {
  const createSiteWithContent = (
    siteKey: string,
    childrenNodes: {
      name: string;
      primaryNodeType: string;
      properties?: { name: string; value: string; language: string }[];
    }[],
  ) => {
    deleteSite(siteKey); // cleanup from previous test runs
    createSite(siteKey, {
      languages: "en,fr_LU,fr,de",
      templateSet: "javascript-modules-engine-test-module",
      locale: "en",
      serverName: "localhost",
    });
    enableModule("hydrogen", siteKey); // allow adding components from the "hydrogen" module

    addSimplePage(`/sites/${siteKey}/home`, "testPageI18N", "Test i18n en", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      cy.apollo({
        variables: {
          pathOrId: `/sites/${siteKey}/home/testPageI18N`,
          properties: [
            { name: "jcr:title", value: "Test i18n fr_LU", language: "fr_LU" },
            { name: "jcr:title", value: "Test i18n fr", language: "fr" },
            { name: "jcr:title", value: "Test i18n de", language: "de" },
          ],
        },
        mutationFile: "graphql/setProperties.graphql",
      });

      childrenNodes.forEach((childNode) => {
        addNode({
          parentPathOrId: `/sites/${siteKey}/home/testPageI18N/pagecontent`,
          name: childNode.name,
          primaryNodeType: childNode.primaryNodeType,
          properties: childNode.properties ?? [],
        });
      });
    });

    publishAndWaitJobEnding(`/sites/${siteKey}/home/testPageI18N`, ["en", "fr_LU", "fr", "de"]);
  };

  it("Test I18n values in various workspace/locales and various type of usage SSR/hydrate/rendered client side", () => {
    const siteKey = "javascriptI18NTestSite";
    createSiteWithContent(siteKey, [
      { name: "test", primaryNodeType: "javascriptExample:testI18n" },
    ]);

    cy.login();
    ["live", "default"].forEach((workspace) => {
      ["en", "fr_LU", "fr", "de"].forEach((locale) => {
        cy.visit(`/cms/render/${workspace}/${locale}/sites/${siteKey}/home/testPageI18N.html`);
        testI18n(locale, 'div[data-testid="i18n-server-side"]', "We are server side !", false);
        testI18n(
          locale,
          'div[data-testid="i18n-hydrated-client-side"]',
          "We are hydrated client side !",
          true,
        );
        testI18n(
          locale,
          'div[data-testid="i18n-rendered-client-side"]',
          "We are rendered client side !",
          true,
        );
      });
      cy.get('[data-testid="getSiteLocales"]').should("contain", "de,en,fr,fr_LU");
    });
    cy.logout();

    deleteSite(siteKey);
  });

  const testI18n = (
    locale: string,
    mainSelector: string,
    placeholderIntialValue: string,
    placeholderShouldBeDynamic: boolean,
  ) => {
    cy.get(`${mainSelector} div[data-testid="i18n-simple"]`).should(
      "contain",
      testData.translations[locale].simple,
    );
    cy.get(`${mainSelector} div[data-testid="i18n-placeholder"]`).should(
      "contain",
      testData.translations[locale].composed.replace("{{placeholder}}", placeholderIntialValue),
    );

    const newPlaceholderValue =
      "Updated placeholder to test dynamic client side placeholder in i18n translation !";
    cy.get(`${mainSelector} input[data-testid="i18n-edit-placeholder"]`).clear();
    cy.get(`${mainSelector} input[data-testid="i18n-edit-placeholder"]`).type(newPlaceholderValue);
    if (placeholderShouldBeDynamic) {
      // Check that the placeholder is dynamic and it been have updated and translation is still good
      cy.get(`${mainSelector} div[data-testid="i18n-placeholder"]`).should(
        "contain",
        testData.translations[locale].composed.replace("{{placeholder}}", newPlaceholderValue),
      );
    } else {
      // Check that the placeholder didn't change, the component is not dynamic (not hydrated, not rendered client side)
      cy.get(`${mainSelector} div[data-testid="i18n-placeholder"]`).should(
        "contain",
        testData.translations[locale].composed.replace("{{placeholder}}", placeholderIntialValue),
      );
    }
  };

  it("Support i18n with components from multiple JS modules on the same page", () => {
    const siteKey = "javascriptI18NMultiModuleTestSite";
    // create a page with alternating components from two different JS modules
    createSiteWithContent(siteKey, [
      {
        name: "hydrogen_1",
        primaryNodeType: "hydrogen:helloWorld",
        properties: [{ name: "name", value: "John Doe", language: "en" }],
      },
      { name: "javascriptExample_1", primaryNodeType: "javascriptExample:testI18n" },
      {
        name: "hydrogen_2",
        primaryNodeType: "hydrogen:helloWorld",
        properties: [{ name: "name", value: "Jane Smith", language: "en" }],
      },
      { name: "javascriptExample_2", primaryNodeType: "javascriptExample:testI18n" },
    ]);

    cy.login();
    ["live", "default"].forEach((workspace) => {
      cy.visit(`/cms/render/${workspace}/en/sites/${siteKey}/home/testPageI18N.html`);

      // make sure the 2 modules are present on the page with their i18n store
      cy.get('script[data-i18n-store="javascript-modules-engine-test-module"]').should("exist");
      cy.get('script[data-i18n-store="hydrogen"]').should("exist");
      cy.get("jsm-island").then(($islands) => {
        // get unique "data-bundle" values from all islands elements
        const bundles = new Set($islands.get().map((el) => el.getAttribute("data-bundle")));
        expect(bundles.size).to.eq(2);
        expect(bundles).to.contain("javascript-modules-engine-test-module");
        expect(bundles).to.contain("hydrogen");
      });

      // make sure the translations are rendered server-side
      // - for hydrogen:helloWorld :
      cy.get(
        'p:contains("Welcome to Jahia! You successfully created a new JavaScript Module and a Jahia Website built with it. Here are a few things you can do now:")',
      ).should("have.length", 2);
      // - for javascriptExample:testI18n :
      cy.get('div[data-testid="i18n-server-side"] div[data-testid="i18n-simple"]')
        .should("contain", testData.translations.en.simple)
        .should("have.length", 2);

      // make sure the translations are rendered client-side
      cy.get(
        'div[data-testid="i18n-hydrated-client-side"] jsm-island[data-bundle="javascript-modules-engine-test-module"]' +
          ' [data-testid="i18n-simple"]',
      )
        .should("contain", testData.translations.en.simple)
        .should("have.length", 2);
      cy.get('jsm-island[data-bundle="hydrogen"] [data-testid="i18n-client-only"]')
        .should(
          "contain",
          "Rendered client-side only", // the translated content
        )
        .should("have.length", 2);
    });

    cy.logout();

    deleteSite(siteKey);
  });
});
