import { HYDROGEN_SITE_KEY } from '../../support/constants';

describe("Validate the concepts of the tutorial: 2 - Making a Hero Section", () => {
  it("buildNodeUrl should build a valid URL", () => {
    cy.visit(`/sites/${HYDROGEN_SITE_KEY}/home.html`);
    // test buildNodeUrl works as intended for the background image:
    cy.get(
      `body header[style="background-image:url(/files/live/sites/${HYDROGEN_SITE_KEY}/files/energy-for-everyone.jpeg)"]`,
    ).should("exist");
  });
  it("the page properties should be correctly retrieved", () => {
    cy.visit(`/sites/${HYDROGEN_SITE_KEY}/home.html`);
    cy.get("body header h1").contains("Energy for everyone");
    cy.get("body header p").contains("Hydrogen is the most");
  });
  it("the CSS class should be correctly set", () => {
    cy.visit(`/sites/${HYDROGEN_SITE_KEY}/home.html`);
    cy.get("body header").should("have.attr", "class");
  });
  const cta = [{ text: "Discover Hydrogen", link: "https://en.wikipedia.org/wiki/Hydrogen" }];
  cta.forEach(({ text, link }) => {
    it(`${text}: the CTA buttons should be correctly rendered`, () => {
      cy.visit(`/sites/${HYDROGEN_SITE_KEY}/home.html`);
      cy.get(`body header div a[href='${link}']`).should("have.text", text);
    });
  });
});
