import { addNode } from "@jahia/cypress";
import { parse, stringify } from "devalue";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

const pageName = "testGenericActions";
const pagePath = `/sites/${GENERIC_SITE_KEY}/home/${pageName}`;
const MODULE = "javascript-modules-engine-test-module";

/** Calls the generic action endpoint the same way the generated client stubs do. */
const callAction = (
  name: string,
  args: unknown[],
  headers: Record<string, string> = { "X-JS-Action": "1", "accept": "application/json" },
) =>
  cy.request({
    method: "POST",
    url: `/cms/render/default/en${pagePath}.jsAction.do?name=${encodeURIComponent(name)}`,
    headers,
    body: stringify(args),
    failOnStatusCode: false,
  });

describe("Actions (.action.ts files)", () => {
  before("Create test page", () => {
    cy.login();
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `${pagePath}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testGenericAction",
      });
    });
    cy.logout();
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("executes an async action and returns its devalue-serialized result", () => {
    callAction(`${MODULE}/add`, [20, 22]).then((response) => {
      expect(response.status).to.eq(200);
      expect(parse(response.body.data)).to.eq(42);
    });
  });

  it("round-trips devalue-only types (Date, Map, Set)", () => {
    const date = new Date("2026-01-02T03:04:05.000Z");
    const args = [{ date, map: new Map([["a", 1]]), set: new Set(["present"]) }];
    callAction(`${MODULE}/echoKinds`, args).then((response) => {
      const result = parse(response.body.data) as {
        date: Date;
        dateType: boolean;
        mapSize: number;
        setHas: boolean;
      };
      expect(result.dateType, "server saw a real Date").to.eq(true);
      expect(result.mapSize).to.eq(1);
      expect(result.setHas).to.eq(true);
      expect(result.date.getTime()).to.eq(date.getTime());
    });
  });

  it("answers the envelope even when the caller does not ask for JSON", () => {
    // The endpoint has no other representation to offer, so it must not depend on the accept header
    callAction(`${MODULE}/add`, [20, 22], { "X-JS-Action": "1" }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.contain("application/json");
      expect(parse(response.body.data)).to.eq(42);
    });
  });

  it("surfaces thrown errors as a server error", () => {
    callAction(`${MODULE}/failOnPurpose`, []).then((response) => {
      expect(response.status).to.eq(500);
      expect(response.body.error).to.contain("Intentional failure");
    });
  });

  it("rejects invalid input of safe actions with validation issues", () => {
    callAction(`${MODULE}/safeDouble`, [{ n: -1 }]).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.error).to.contain("n must be a positive number");
      expect(response.body.issues[0].message).to.eq("n must be a positive number");
    });
    callAction(`${MODULE}/safeDouble`, [{ n: 21 }]).then((response) => {
      expect(response.status).to.eq(200);
      expect(parse(response.body.data)).to.eq(42);
    });
  });

  it("requires the X-JS-Action header (CSRF hardening)", () => {
    callAction(`${MODULE}/add`, [1, 2], {}).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.error).to.contain("X-JS-Action");
    });
  });

  it("reports unknown actions", () => {
    callAction(`${MODULE}/doesNotExist`, []).then((response) => {
      expect(response.status).to.eq(404);
      expect(response.body.error).to.contain("Unknown action");
    });
  });

  it("works end-to-end from a client island through the generated stubs", () => {
    cy.visit(`/cms/render/default/en${pagePath}.html`);
    cy.get('button[data-testid="call-add"]').click();
    cy.get('p[data-testid="action-result"]').should("contain", "add:42");
    cy.get('button[data-testid="call-invalid"]').click();
    cy.get('p[data-testid="action-result"]').should(
      "contain",
      "rejected:n must be a positive number",
    );
    cy.get('button[data-testid="call-failing"]').click();
    cy.get('p[data-testid="action-result"]').should("contain", "failed:Intentional failure");
  });
});
