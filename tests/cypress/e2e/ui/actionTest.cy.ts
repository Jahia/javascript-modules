import { addNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

const pageName = "testJsActions";
const nodePath = `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent/test`;
const actionUrl = (action: string, workspace = "live") =>
  `/cms/render/${workspace}/en${nodePath}.${action}.do`;

/**
 * Jahia only writes an action's JSON body when the caller asks for it (an `accept` header holding
 * `application/json`, or a `returnContentType=json` parameter) — legacy node actions declared in JS
 * follow the same contract as Java ones, so a JSON-reading caller has to say so.
 */
const JSON_HEADERS = { accept: "application/json" };

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
    cy.request({
      url: `${actionUrl("testJsActionGet")}?echo=hello`,
      headers: JSON_HEADERS,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.echo).to.equal("hello");
      expect(response.body.path).to.equal(nodePath);
    });
  });

  it("executes a CSRF-whitelisted POST action with form parameters", () => {
    cy.request({
      method: "POST",
      url: actionUrl("testJsActionPost"),
      headers: JSON_HEADERS,
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
    cy.request({ url: actionUrl("testJsActionAuth", "default"), headers: JSON_HEADERS }).then(
      (response) => {
        expect(response.status).to.equal(200);
        expect(response.body.user).to.equal("root");
      },
    );
    cy.logout();
  });

  it("sends redirects", () => {
    cy.request({ url: actionUrl("testJsActionRedirect"), followRedirect: false }).then(
      (response) => {
        // Jahia chooses the redirect status (303 by default), the action only chooses the target
        expect(response.status).to.be.within(300, 308);
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
    cy.request({
      url: `${actionUrl("testJsActionGet")}?echo=after-redeploy`,
      headers: JSON_HEADERS,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.echo).to.equal("after-redeploy");
    });
  });
});
