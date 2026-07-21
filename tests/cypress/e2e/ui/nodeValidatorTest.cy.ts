import { addNode, deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

const pageName = "testJsValidators";
const parentPath = `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent`;

const ADD_NODE_MUTATION = `
  mutation addValidatedNode($parentPathOrId: String!, $name: String!, $properties: [InputJCRProperty!]) {
    jcr {
      addNode(
        parentPathOrId: $parentPathOrId
        name: $name
        primaryNodeType: "javascriptExample:testValidation"
        properties: $properties
      ) {
        uuid
      }
    }
  }
`;

/** Attempts to create a testValidation node and yields the raw apollo response (errors included). */
const tryCreate = (name: string, properties: Array<{ name: string; value: string; language?: string }>) =>
  cy.apollo({
    mutation: ADD_NODE_MUTATION,
    variables: { parentPathOrId: parentPath, name, properties },
    errorPolicy: "all",
  });

const errorMessages = (response: { errors?: Array<{ message: string }> }): string =>
  (response.errors ?? []).map((error) => error.message).join(" | ");

describe("JS node validators", () => {
  before("Create test page", () => {
    cy.login();
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
    cy.logout();
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("accepts valid content", () => {
    addNode({
      parentPathOrId: parentPath,
      name: "valid",
      primaryNodeType: "javascriptExample:testValidation",
      properties: [
        { name: "email", value: "someone@example.org" },
        { name: "score", value: "50" },
      ],
    }).then((response) => {
      expect(response?.data?.jcr?.addNode?.uuid).to.exist;
      deleteNode(`${parentPath}/valid`);
    });
  });

  it("rejects a save with a field-level violation", () => {
    tryCreate("invalidEmail", [{ name: "email", value: "not-an-email" }]).then((response) => {
      expect(errorMessages(response)).to.contain("Please provide a valid email address");
    });
  });

  it("rejects a save with a node-level violation", () => {
    tryCreate("nodeLevel", [{ name: "email", value: "node-level-probe" }]).then((response) => {
      expect(errorMessages(response)).to.contain("This content is inconsistent (node-level probe)");
    });
  });

  it("passes messages through verbatim, including special characters", () => {
    tryCreate("escaping", [{ name: "email", value: "escaping-probe" }]).then((response) => {
      expect(errorMessages(response)).to.contain("lone { brace, ${7*7}, back\\slash and {jcr:title}");
    });
  });

  it("runs advanced-phase validators only after the default phase passes", () => {
    // both phases violated: only the default-phase message surfaces
    tryCreate("bothPhases", [
      { name: "email", value: "not-an-email" },
      { name: "score", value: "200" },
    ]).then((response) => {
      const messages = errorMessages(response);
      expect(messages).to.contain("Please provide a valid email address");
      expect(messages).to.not.contain("advanced phase");
    });

    // default phase clean: the advanced violation surfaces
    tryCreate("advancedOnly", [
      { name: "email", value: "someone@example.org" },
      { name: "score", value: "200" },
    ]).then((response) => {
      expect(errorMessages(response)).to.contain("Score must be at most 100 (advanced phase)");
    });
  });

  it("still validates after a module redeploy invalidates the JS context pool", () => {
    // bridges re-resolve JS validators from the live registry on every save; a redeploy of the
    // test module must not break validation
    cy.runProvisioningScript({
      script: {
        fileContent: '- enable: "javascript-modules-engine-test-module"',
        type: "application/yaml",
      },
    });
    tryCreate("afterRedeploy", [{ name: "email", value: "not-an-email" }]).then((response) => {
      expect(errorMessages(response)).to.contain("Please provide a valid email address");
    });
  });
});
