import { createSite, deleteSite } from "@jahia/cypress";

/**
 * A site of its own, with French enabled: the shared test site is English-only, and asking its
 * creation form for a `fr` content locale simply falls back to English — which would make the
 * localization assertion below pass or fail depending on the Jahia version rather than on the
 * initializer.
 */
const SITE_KEY = "jsChoicelistSite";

interface ValueConstraint {
  displayValue: string;
  value: { string: string };
  properties: Array<{ name: string; value: string }>;
}

interface Field {
  name: string;
  valueConstraints: ValueConstraint[];
}

/**
 * Fetches the creation form of the test node type and returns its fields, flattened. Initializers
 * receive the CONTENT locale (the language being edited), not the UI locale.
 */
const getFormFields = (locale: string): Cypress.Chainable<Field[]> =>
  cy
    .apollo({
      queryFile: "graphql/createForm.graphql",
      variables: {
        nodeType: "javascriptExample:testChoicelistInitializer",
        uiLocale: "en",
        locale,
        uuidOrPath: `/sites/${SITE_KEY}/home`,
      },
    })
    .then((response) =>
      response.data.forms.createForm.sections.flatMap(
        (section: { fieldSets: Array<{ fields: Field[] }> }) =>
          section.fieldSets.flatMap((fieldSet) => fieldSet.fields),
      ),
    );

const field = (fields: Field[], name: string): Field => {
  const match = fields.find((f) => f.name === name);
  expect(match, `field ${name} present in the form`).to.exist;
  return match;
};

const constraintValues = (f: Field): string[] => f.valueConstraints.map((c) => c.value.string);
const constraintLabel = (f: Field, value: string): string =>
  f.valueConstraints.find((c) => c.value.string === value)?.displayValue;

describe("JS choicelist initializers", () => {
  before("Create a site with French enabled", () => {
    cy.login();
    deleteSite(SITE_KEY);
    createSite(SITE_KEY, {
      languages: "en,fr",
      templateSet: "javascript-modules-engine-test-module",
      locale: "en",
      serverName: "localhost",
    });
    cy.logout();
  });

  after("Remove the site", () => {
    cy.login();
    deleteSite(SITE_KEY);
    cy.logout();
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("populates the choicelist declared in JS", () => {
    getFormFields("en").then((fields) => {
      const color = field(fields, "color");
      expect(constraintValues(color)).to.include.members(["red", "green", "propName"]);
      expect(constraintLabel(color, "red")).to.equal("Red");
      expect(constraintLabel(color, "green")).to.equal("Green");
    });
  });

  it("exposes choice properties (defaultProperty)", () => {
    getFormFields("en").then((fields) => {
      const green = field(fields, "color").valueConstraints.find((c) => c.value.string === "green");
      const defaultProperty = green.properties.find((p) => p.name === "defaultProperty");
      expect(defaultProperty, "defaultProperty on green").to.exist;
      expect(String(defaultProperty.value)).to.equal("true");
    });
  });

  it("passes the CND parameter to the initializer", () => {
    getFormFields("en").then((fields) => {
      expect(constraintValues(field(fields, "colorWithParam"))).to.include("orange");
      expect(constraintValues(field(fields, "color"))).to.not.include("orange");
    });
  });

  it("gives the initializer access to the raw property definition (escape hatch)", () => {
    getFormFields("en").then((fields) => {
      // the fixture derives a label from ExtendedPropertyDefinition#getName()
      expect(constraintLabel(field(fields, "color"), "propName")).to.equal("prop:color");
      expect(constraintLabel(field(fields, "colorWithParam"), "propName")).to.equal(
        "prop:colorWithParam",
      );
    });
  });

  it("localizes labels through the content locale", () => {
    getFormFields("fr").then((fields) => {
      expect(constraintLabel(field(fields, "color"), "red")).to.equal("Rouge");
    });
  });
});
