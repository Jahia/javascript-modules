import { addNode, createSite, deleteSite, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/Utils";

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
  before("Create test site/contents", () => {
    createSite("javascriptI18NTestSite", {
      languages: "en,fr_LU,fr,de",
      templateSet: "javascript-modules-engine-test-module",
      locale: "en",
      serverName: "localhost",
    });

    addSimplePage(
      "/sites/javascriptI18NTestSite/home",
      "testPageI18N",
      "Test i18n en",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      cy.apollo({
        variables: {
          pathOrId: "/sites/javascriptI18NTestSite/home/testPageI18N",
          properties: [
            { name: "jcr:title", value: "Test i18n fr_LU", language: "fr_LU" },
            { name: "jcr:title", value: "Test i18n fr", language: "fr" },
            { name: "jcr:title", value: "Test i18n de", language: "de" },
          ],
        },
        mutationFile: "graphql/setProperties.graphql",
      });

      addNode({
        parentPathOrId: "/sites/javascriptI18NTestSite/home/testPageI18N/pagecontent",
        name: "test",
        primaryNodeType: "javascriptExample:testI18n",
      });
    });

    publishAndWaitJobEnding("/sites/javascriptI18NTestSite/home/testPageI18N", [
      "en",
      "fr_LU",
      "fr",
      "de",
    ]);
  });

  it("Test I18n values in various workspace/locales and various type of usage SSR/hydrate/rendered client side", () => {
    cy.login();
    ["live", "default"].forEach((workspace) => {
      ["en", "fr_LU", "fr", "de"].forEach((locale) => {
        cy.visit(
          `/cms/render/${workspace}/${locale}/sites/javascriptI18NTestSite/home/testPageI18N.html`,
        );
        testI18n(
          workspace,
          locale,
          'div[data-testid="i18n-server-side"]',
          "We are server side !",
          false,
        );
        testI18n(
          workspace,
          locale,
          'div[data-testid="i18n-hydrated-client-side"]',
          "We are hydrated client side !",
          true,
        );
        testI18n(
          workspace,
          locale,
          'div[data-testid="i18n-rendered-client-side"]',
          "We are rendered client side !",
          true,
        );
      });

      cy.get('[data-testid="getSiteLocales"]').should("contain", "de,en,fr,fr_LU");
    });
    cy.logout();
  });

  const testI18n = (
    workspace: string,
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

  after("Cleanup", () => {
    cy.visit("/start", { failOnStatusCode: false });
    deleteSite("javascriptI18NTestSite");
  });
});
