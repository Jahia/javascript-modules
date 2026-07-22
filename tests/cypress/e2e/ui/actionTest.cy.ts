import { addNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

const pageName = "testJsActions";
const nodePath = `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent/test`;
const actionUrl = (action: string, workspace = "live") =>
  `/cms/render/${workspace}/en${nodePath}.${action}.do`;

describe("JS actions", () => {
  before("Create and publish test content", () => {
    cy.login();
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testGetNodeProps",
      });
    });
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/${pageName}`);
    cy.logout();
  });

  it("executes a GET action and returns JSON", () => {
    cy.request(`${actionUrl("testJsActionGet")}?echo=hello`).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.echo).to.equal("hello");
      expect(response.body.path).to.equal(nodePath);
    });
  });

  it("executes a CSRF-whitelisted POST action with form parameters", () => {
    cy.request({
      method: "POST",
      url: actionUrl("testJsActionPost"),
      form: true,
      body: { payload: "some-content" },
    }).then((response) => {
      expect(response.status).to.equal(201);
      expect(response.body.received).to.equal("some-content");
    });
  });

  it("rejects guests on an action requiring authentication", () => {
    cy.request({ url: actionUrl("testJsActionAuth"), failOnStatusCode: false }).then((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("executes an authenticated action for a logged-in user", () => {
    cy.login();
    cy.request(actionUrl("testJsActionAuth", "default")).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.user).to.equal("root");
    });
    cy.logout();
  });

  it("sends redirects", () => {
    cy.request({ url: actionUrl("testJsActionRedirect"), followRedirect: false }).then(
      (response) => {
        expect(response.status).to.equal(302);
        expect(response.headers.location).to.contain("/redirected-target");
      },
    );
  });

  it("rejects disallowed HTTP methods", () => {
    // testJsActionPost only allows POST
    cy.request({ url: actionUrl("testJsActionPost"), failOnStatusCode: false }).then((response) => {
      expect(response.status).to.be.gte(400);
    });
  });

  it("still executes actions after a module redeploy invalidates the JS context pool", () => {
    // the bridge re-resolves the JS function from the live registry on every call
    cy.login();
    cy.runProvisioningScript({
      script: {
        fileContent: '- enable: "javascript-modules-engine-test-module"',
        type: "application/yaml",
      },
    });
    cy.logout();
    cy.request(`${actionUrl("testJsActionGet")}?echo=after-redeploy`).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.echo).to.equal("after-redeploy");
    });
  });
});
