/**
 * Verifies the JS content patches of the test module (declared in
 * jahia-test-module/src/react/server/extensions/contentPatches.ts): they ran once at module start,
 * in name order, with the expected terminal statuses in Jahia's module patch status store, and the
 * fixture content was transformed accordingly.
 */

const MODULE_NAME = "javascript-modules-engine-test-module";
const STATUS_PATH_PREFIX = "/javascript/content-patches/";
const FIXTURES_PATH = "/sites/systemsite/contents/content-patch-tests";

const NODE_QUERY = `
  query migratedNode($path: String!) {
    jcr {
      nodeByPath(path: $path) {
        primaryNodeType {
          name
        }
        properties {
          name
          value
        }
      }
    }
  }
`;

const STATUS_QUERY = `
  query contentPatchStatuses {
    jcr {
      nodeByPath(path: "/module-management") {
        property(name: "j:bundlesScripts") {
          value
        }
      }
    }
  }
`;

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
  cy.apollo({ query: NODE_QUERY, variables: { path }, errorPolicy: "all" });

const propertiesOf = (response: NodeResponse): Record<string, string> =>
  Object.fromEntries(
    (response.data?.jcr?.nodeByPath?.properties ?? []).map(({ name, value }) => [name, value]),
  );

describe("JS content patches", () => {
  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("records terminal statuses in the module patch status store", () => {
    cy.apollo({ query: STATUS_QUERY }).then((response) => {
      const raw = response.data?.jcr?.nodeByPath?.property?.value;
      expect(raw, "j:bundlesScripts property").to.be.a("string");
      const statuses = (JSON.parse(raw)[MODULE_NAME] ?? {}) as Record<string, string>;

      for (const installed of [
        "1.0.0-01-create-fixture-content",
        "1.0.0-02-remove-legacy-color",
        "1.0.0-03-backfill-theme",
        "1.0.0-04-convert-counter",
        "1.0.0-05-rename-legacy-type",
        "1.0.0-06-remove-doomed-type",
      ]) {
        expect(statuses[STATUS_PATH_PREFIX + installed], installed).to.equal(".installed");
      }
      expect(statuses[STATUS_PATH_PREFIX + "1.0.0-07-skip-me"], "07 skips").to.equal(".skipped");
      expect(statuses[STATUS_PATH_PREFIX + "1.0.0-08-fail-on-purpose"], "08 fails").to.equal(
        ".failed",
      );
      // 08 failed, so 09 was halted: no status, and it stays pending
      expect(
        statuses[STATUS_PATH_PREFIX + "1.0.0-09-after-failure-never-runs"],
        "09 is halted by 08",
      ).to.equal(undefined);
    });
  });

  it("removes property values and backfills new ones (U1, U2)", () => {
    getNode(`${FIXTURES_PATH}/content1`).then((response: NodeResponse) => {
      const properties = propertiesOf(response);
      expect(properties.legacyColor, "legacyColor cleaned by 02").to.equal(undefined);
      // 03 backfilled "light"; if 09 had run despite the halt, it would be "NEVER"
      expect(properties.theme, "theme backfilled by 03").to.equal("light");
    });
  });

  it("converts property values (U3)", () => {
    getNode(`${FIXTURES_PATH}/content1`).then((response: NodeResponse) => {
      // the numeric representation may serialize as "42" or "42.0" depending on the stored type
      expect(propertiesOf(response).counter, "counter converted by 04").to.match(/^42(\.0)?$/);
    });
  });

  it("rebinds content to a renamed node type (U5)", () => {
    getNode(`${FIXTURES_PATH}/legacy1`).then((response: NodeResponse) => {
      expect(response.data?.jcr?.nodeByPath?.primaryNodeType.name, "rebound by 05").to.equal(
        "javascriptExample:patchTestNew",
      );
      const properties = propertiesOf(response);
      expect(properties.newTitle, "value moved to newTitle").to.equal("hello");
      expect(properties.oldTitle, "oldTitle removed").to.equal(undefined);
    });
  });

  it("purges instances of a removed node type (U4)", () => {
    getNode(`${FIXTURES_PATH}/doomed1`).then((response: NodeResponse) => {
      expect(response.data?.jcr?.nodeByPath ?? null, "doomed1 deleted by 06").to.equal(null);
    });
  });
});
