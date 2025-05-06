import { posts, siteKey } from "./data";

describe("Validate the concepts of the tutorial: 4 - Making a Blog", () => {
  it("the blog home page should only list published posts in the right order", () => {
    cy.visit(`/sites/${siteKey}/blog.html`);
    cy.get("body main article").should("have.length", posts.length);
    posts.forEach((post, index) => {
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
    cy.visit(`/sites/${siteKey}/blog.html`);
    posts.forEach((post, index) => {
      cy.get("body main article")
        .eq(index)
        .within(() => {
          cy.get("a")
            .should("have.attr", "href")
            .then((href) => {
              cy.request(href.toString()).its("status").should("eq", 200);
            });
        });
    });
  });
});
