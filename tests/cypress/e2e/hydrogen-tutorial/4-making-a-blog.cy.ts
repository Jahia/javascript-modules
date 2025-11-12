import { HYDROGEN_SITE_KEY, HYDROGEN_POSTS, JAHIA_CONTEXT } from "../../support/constants";

describe("Validate the concepts of the tutorial: 4 - Making a Blog", () => {
  it("the blog home page should only list published posts in the right order", () => {
    cy.visit(`/sites/${HYDROGEN_SITE_KEY}/blog.html`);
    cy.get("body main article").should("have.length", HYDROGEN_POSTS.length);
    HYDROGEN_POSTS.forEach((post, index) => {
      cy.get("body main article")
        .eq(index)
        .within(() => {
          cy.get("h3").should("have.text", post.title);
          cy.get("p").first().should("have.text", post.subTitle);
          cy.get("p").eq(1).should("have.text", post.details);
        });
    });
  });

  it("each article should be clickable and lead to a valid page", () => {
    cy.visit(`/sites/${HYDROGEN_SITE_KEY}/blog.html`);
    HYDROGEN_POSTS.forEach((post, index) => {
      cy.get("body main article")
        .eq(index)
        .within(() => {
          cy.get("a")
            .should("have.attr", "href")
            .then((href) => {
              cy.request(
                // cy.request already prepends the context, we need to remove it from the href
                href.toString().slice(JAHIA_CONTEXT.length),
                {},
              )
                .its("status")
                .should("eq", 200);
            });
        });
    });
  });
});
