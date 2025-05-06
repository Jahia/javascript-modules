import { posts, siteKey } from "./data";

describe("Validate the concepts of the tutorial: 5 - View Content in Full Page", () => {
  posts.forEach(({ page, title, subTitle, details, extract }) => {
    it(`${page}.html: the hero section should be present on the blog post`, () => {
      cy.visit(`/sites/${siteKey}/contents/blog/${page}.html`);
      cy.get("body header")
        .first()
        .within(() => {
          cy.get("h1").should("have.text", title);
          cy.get("p").should("have.text", subTitle);
        });
    });

    it(`${page}.html: the main article should be displayed`, () => {
      cy.visit(`/sites/${siteKey}/contents/blog/${page}.html`);
      cy.get("body main")
        .first()
        .within(() => {
          cy.get("header p").should("have.text", details);
          cy.get("article p").first().should("contain.html", extract);
        });
    });

    it(`${page}.html: the page should have a 'back to blog home' link`, () => {
      cy.visit(`/sites/${siteKey}/contents/blog/${page}.html`);
      cy.get("body main footer p")
        .first()
        .within(() => {
          cy.get("a")
            .should("have.attr", "href", `/sites/${siteKey}/blog.html`)
            .and("have.text", "Back to blog home");
        });
    });
  });
});
