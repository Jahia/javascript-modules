/**
 * Runs the SAME content patch operations as the JS fixtures (contentPatches.ts, patches 02-06), but
 * from a Groovy script through the engine's exported Java API (ContentPatchService), on mirrored
 * fixture content — and asserts the same outcomes. Together with contentPatchTest.cy.ts this is the
 * executable DevEx/feature-parity comparison between the TypeScript and Groovy faces of the shared
 * operations engine.
 *
 * Lifecycle semantics (run-once statuses, ordering, halt-on-failure) are deliberately not re-tested
 * here: for Groovy patches they belong to core's extender, which this engine reuses but does not
 * change.
 */

const FIXTURES_PATH = "/sites/systemsite/contents/content-patch-groovy-tests";

interface NodeResponse {
  data?: {
    jcr?: {
      nodeByPath?: {
        primaryNodeType: { name: string };
        properties: Array<{ name: string; value: string }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const getNode = (path: string) =>
  cy.apollo({
    queryFile: "graphql/contentPatchNode.graphql",
    variables: { path },
    errorPolicy: "all",
  });

const propertiesOf = (response: NodeResponse): Record<string, string> =>
  Object.fromEntries(
    (response.data?.jcr?.nodeByPath?.properties ?? []).map(({ name, value }) => [name, value]),
  );

describe("Content patch operations from Groovy (parity with the JS bridge)", () => {
  before("Create the fixture content and run the operations from Groovy", () => {
    cy.login();
    // leftovers of a previous run (the fixtures are not part of the run-once patch lifecycle)
    cy.apollo({
      mutationFile: "graphql/contentPatchGroovyCleanup.graphql",
      variables: { pathOrId: FIXTURES_PATH },
      errorPolicy: "all",
    });
    cy.apollo({ mutationFile: "graphql/contentPatchGroovyFolder.graphql" });
    cy.apollo({
      mutationFile: "graphql/contentPatchGroovyFixture.graphql",
      variables: {
        name: "content1",
        type: "javascriptExample:patchTestGroovyContent",
        properties: [
          { name: "legacyColor", value: "red" },
          { name: "counter", value: "42" },
        ],
      },
    });
    cy.apollo({
      mutationFile: "graphql/contentPatchGroovyFixture.graphql",
      variables: {
        name: "legacy1",
        type: "javascriptExample:patchTestGroovyLegacy",
        properties: [{ name: "oldTitle", value: "hello" }],
      },
    });
    cy.apollo({
      mutationFile: "graphql/contentPatchGroovyFixture.graphql",
      variables: {
        name: "doomed1",
        type: "javascriptExample:patchTestGroovyDoomed",
        properties: [{ name: "label", value: "to be deleted" }],
      },
      // after a previous run the doomed type is unregistered until the module is redeployed —
      // creation then fails and removeNodeType below no-ops gracefully, which the assertions allow
      errorPolicy: "all",
    });
    cy.executeGroovy("groovy/contentPatchParityOperations.groovy", {}).then((result) => {
      expect(String(result), "groovy script result").to.contain("applied");
    });
    cy.logout();
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("removes property values and backfills new ones (U1, U2)", () => {
    getNode(`${FIXTURES_PATH}/content1`).then((response: NodeResponse) => {
      const properties = propertiesOf(response);
      expect(properties.legacyColor, "legacyColor cleaned (U1)").to.equal(undefined);
      expect(properties.theme, "theme backfilled (U2)").to.equal("light");
    });
  });

  it("converts property values (U3)", () => {
    getNode(`${FIXTURES_PATH}/content1`).then((response: NodeResponse) => {
      // the numeric representation may serialize as "42" or "42.0" depending on the stored type
      expect(propertiesOf(response).counter, "counter converted (U3)").to.match(/^42(\.0)?$/);
    });
  });

  it("rebinds content to a renamed node type (U5)", () => {
    getNode(`${FIXTURES_PATH}/legacy1`).then((response: NodeResponse) => {
      expect(response.data?.jcr?.nodeByPath?.primaryNodeType.name, "rebound (U5)").to.equal(
        "javascriptExample:patchTestGroovyNew",
      );
      const properties = propertiesOf(response);
      expect(properties.newTitle, "value moved to newTitle").to.equal("hello");
      expect(properties.oldTitle, "oldTitle removed").to.equal(undefined);
    });
  });

  it("purges instances of a removed node type (U4)", () => {
    getNode(`${FIXTURES_PATH}/doomed1`).then((response: NodeResponse) => {
      expect(response.data?.jcr?.nodeByPath ?? null, "doomed1 deleted (U4)").to.equal(null);
    });
  });
});
