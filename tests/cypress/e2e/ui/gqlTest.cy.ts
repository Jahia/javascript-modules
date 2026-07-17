import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

describe("Test GQL", () => {
  before("Create test page and contents", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testJGQL", "testJGQL", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testJGQL/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testGQL",
        properties: [
          { name: "jcr:title", value: "test component" },
          { name: "prop1", value: "prop1 value" },
          { name: "prop2", value: "prop2 value !@#$%ˆ//{}È" },
          {
            name: "propRichText",
            value: '<p data-testid="propRichTextValue">Hello this is a sample rich text</p>',
          },
        ],
      });
    });
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("Check GQL execution in current view", function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testJGQL.html`);
    cy.get('li[data-testid="j:nodename"]').should("contain", "test");
    cy.get('li[data-testid="jcr:title"]').should("contain", "test component");
    cy.get('li[data-testid="prop1"]').should("contain", "prop1 value");
    cy.get('li[data-testid="prop2"]').should("contain", "prop2 value !@#$%ˆ//{}È");
    cy.get('li[data-testid="propRichText"]').should("contain", "Hello this is a sample rich text");
    cy.get('li[data-testid="j:nodename-from-document"]').should("contain", "test");
    cy.get('li[data-testid="jcr:title-from-document"]').should("contain", "test component");
    cy.get('li[data-testid="prop1-from-document"]').should("contain", "prop1 value");
    cy.get('li[data-testid="prop2-from-document"]').should("contain", "prop2 value !@#$%ˆ//{}È");
    cy.get('li[data-testid="propRichText-from-document"]').should(
      "contain",
      "Hello this is a sample rich text",
    );
  });

  // Regression test for the POST render path (e.g. jContent preview's "previewQueryByWorkspace"):
  // when a view using useGQLQuery is rendered while resolving "renderedContent" inside a GraphQL
  // POST, the nested query used to fail with "No valid query found in request" / "Unexpected end of
  // JSON input" because GQLHelper reused the incoming POST request and the servlet read the query
  // from the (already consumed) body instead of the parameters. The GET render path above never hit
  // this. See GQLHelper (forces GET on the synthetic sub-request).
  it("Check GQL execution when the view is rendered inside a GraphQL POST request", function () {
    cy.apollo({
      variables: {
        // Render the testGQL content node directly (its TestGQL view is registered as "default"),
        // so we exercise the view's nested useGQLQuery without depending on a page template.
        path: `/sites/${GENERIC_SITE_KEY}/home/testJGQL/pagecontent/test`,
        templateType: "html",
        view: "default",
        contextConfiguration: "module",
        language: "en",
        workspace: "EDIT",
      },
      queryFile: "graphql/renderedContentByPath.graphql",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).then((response: { data?: any; errors?: unknown[] }) => {
      // Before the fix the nested useGQLQuery threw, surfacing as a GraphQL error and null output.
      expect(response.errors, "GraphQL errors").to.satisfy(
        (errors: unknown[] | undefined) => errors == null || errors.length === 0,
      );
      const output = response.data?.jcr?.nodeByPath?.renderedContent?.output as string;
      expect(output, "rendered output").to.be.a("string").and.not.be.empty;
      // These values are produced by the nested useGQLQuery call inside the TestGQL view, so their
      // presence proves the re-entrant GraphQL query resolved during the POST render.
      expect(output).to.contain("prop1 value");
      expect(output).to.contain("prop2 value !@#$%ˆ//{}È");
      expect(output).to.contain("test component");
    });
  });
});
