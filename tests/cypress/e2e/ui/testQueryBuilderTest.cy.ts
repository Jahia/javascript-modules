import { addNode, getNodeByPath } from "@jahia/cypress";
import { addEvent, addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

/**
 * Drives the `testQueryBuilder` view, which builds one query per construct of the query builder,
 * renders the JCR-SQL2 statement Jahia formats for it, and renders the nodes it returned.
 *
 * The statement the view renders is the one of the rewritten query, not of the model the builder
 * holds: `createQuery` runs Jahia's rewrite before the object model exists, and in a localised
 * session that rewrite adds a `jcr:language` constraint to every selector that carries none. An
 * exact snapshot would therefore depend on the locale of the session and on which properties of the
 * site are internationalised. The assertions below are the fragments that survive the rewrite. They
 * were read from the `QOMFormatter` output of the built models, against the two Jackrabbit fork
 * versions in use, which write them identically. A property fragment carries no selector prefix,
 * because the rewrite can move a property to another selector.
 */
describe("JCR query builder test", () => {
  const scope = `/sites/${GENERIC_SITE_KEY}/contents/queryBuilder`;
  const event = (index: number) => `${scope}/event-${index}`;
  const page = `/sites/${GENERIC_SITE_KEY}/home/queryBuilder`;

  /**
   * The escaping fixture, in its own folder so that its two events never enter the counts the cases
   * scoped to `scope` assert.
   */
  const escapeScope = `/sites/${GENERIC_SITE_KEY}/contents/queryBuilderEscape`;
  const percentEvent = `${escapeScope}/escape-percent`;
  const plainEvent = `${escapeScope}/escape-plain`;

  /** What every statement of a single selector case holds, whatever the rewrite added. */
  const single = [`SELECT e.*`, `FROM [jnt:event] AS e`, `ISDESCENDANTNODE(e, ['${scope}'])`];

  /** The same fragments for a case scoped to the escaping fixture folder. */
  const singleEscape = [
    `SELECT e.*`,
    `FROM [jnt:event] AS e`,
    `ISDESCENDANTNODE(e, ['${escapeScope}'])`,
  ];

  const fragments: Record<string, string[]> = {
    property: [...single, `[jcr:title] = 'Event 1'`],
    path: [...single, `ORDER BY`, `[jcr:title]`],
    page: [...single, `ORDER BY`, `[jcr:title]`],
    fullText: [...single, `CONTAINS(e.*, 'Event')`, `ORDER BY SCORE(e) DESC`],
    date: [...single, `startDate >= CAST('2000-01-01T00:00:00.000Z' AS DATE)`],
    bind: [...single, `startDate >= CAST('2000-01-01T00:00:00.000Z' AS DATE)`],
    join: [
      `SELECT p.*`,
      `AS childTitle`,
      `FROM [jnt:contentFolder] AS p INNER JOIN [jnt:event] AS c ON ISCHILDNODE(c, p)`,
      `ISSAMENODE(p, ['${scope}'])`,
    ],
    mixed: [
      ...single,
      `NOT ISSAMENODE(e, ['${scope}/event-1'])`,
      `[jcr:title] LIKE 'Event%'`,
      `LOWER(`,
      `LENGTH(`,
      `> CAST('3' AS LONG)`,
      `ORDER BY LOWER(`,
      `DESC`,
    ],
    mixedPlain: [
      ...single,
      `NOT ISSAMENODE(e, ['${scope}/event-1'])`,
      `[jcr:title] LIKE 'Event%'`,
      `LENGTH(e.eventsType) > CAST('3' AS LONG)`,
      `ORDER BY LOWER(`,
    ],
    negated: [...single, `NOT `, `[jcr:language] IS NOT NULL`, `UPPER(`, `= 'MEETING'`],
    lengthOnPlain: [...single, `LENGTH(e.eventsType) > CAST('3' AS LONG)`],
    lengthOnI18n: [...single, `LENGTH(e.[jcr:title]) > CAST('3' AS LONG)`],
    upperOnI18n: [...single, `UPPER(e.[jcr:title]) = 'EVENT 1'`],
    notOnI18n: [...single, `NOT e.[jcr:title] = 'Event 1'`],
    lowerOrderOnI18n: [...single, `ORDER BY LOWER(e.[jcr:title]) DESC`],
    lowerOrderOnPlain: [...single, `ORDER BY LOWER(e.eventsType) DESC`],
    literals: [
      ...single,
      `stringProp = 'text'`,
      `longProp = CAST('3' AS LONG)`,
      `doubleProp = CAST('1.5' AS DOUBLE)`,
      `decimalProp = CAST('1.5' AS DECIMAL)`,
      `dateProp = CAST('2000-01-01T00:00:00.000Z' AS DATE)`,
      `booleanProp = true`,
      `nameProp = CAST('jnt:event' AS NAME)`,
      `pathProp = CAST('/sites' AS PATH)`,
      // `JCRValueFactoryImpl` remaps REFERENCE to WEAKREFERENCE, so a `reference()` literal is
      // written with the weak cast. This was read from the live statement, not predicted.
      `referenceProp = CAST('11111111-1111-1111-1111-111111111111' AS WEAKREFERENCE)`,
      `weakProp = CAST('22222222-2222-2222-2222-222222222222' AS WEAKREFERENCE)`,
      `uriProp = CAST('https://www.jahia.com' AS URI)`,
    ],
    predicates: [
      ...single,
      `eventsType = 'meeting'`,
      `eventsType = 'webinar'`,
      `startDate >= CAST('2000-01-01T00:00:00.000Z' AS DATE)`,
      `startDate <= CAST('2099-01-01T00:00:00.000Z' AS DATE)`,
      `[jcr:language] IS NOT NULL`,
    ],
    startsWithPlain: [...single, `eventsType LIKE 'meet%'`],
    // The prefix holds a `%`, which `startsWith` escapes with a backslash, so the pattern reads
    // `50\%%`: a literal `50%`, then the trailing wildcard the method adds. Unlike the fragments
    // above, this one was not read from a live statement. It predicts that the formatter writes the
    // backslash through, because the only escape the SQL2 string literal grammar defines is a
    // doubled quote. The node assertion below is what reads the engine's own behaviour.
    startsWithPercent: [...singleEscape, String.raw`eventsType LIKE '50\%%'`],
    startsWithDigits: [...singleEscape, `eventsType LIKE '50%'`],
    stable: [...single, `ORDER BY`, `[jcr:uuid]`],
  };

  const initEvent = (index: number) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      parentPath: scope,
      name: `event-${index}`,
      title: `Event ${index}`,
      startDate: today,
      endDate: tomorrow,
    };
  };

  /**
   * The paths the view rendered for one case, in the order the query returned them. The children
   * are read with jQuery rather than with `cy.find`, which would retry and then fail on a case that
   * legitimately returned no node.
   */
  const paths = (testid: string) =>
    cy
      .get(`div[data-testid="testQueryBuilder_${testid}"]`)
      .then(($container) =>
        Cypress._.map($container.find("div"), (div) => div.textContent?.trim()),
      );

  const visitView = () => {
    cy.visit(`/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/queryBuilder.html`);
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/queryBuilder.html`);
  };

  before("Create test page and contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "queryBuilder",
      "Test query builder",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      addNode({
        parentPathOrId: `${page}/pagecontent`,
        name: "queryBuilder",
        primaryNodeType: "javascriptExample:testQueryBuilder",
      });

      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/contents`,
        name: "queryBuilder",
        primaryNodeType: "jnt:contentFolder",
      }).then(() => {
        addEvent(GENERIC_SITE_KEY, initEvent(1));
        addEvent(GENERIC_SITE_KEY, initEvent(2));
        addEvent(GENERIC_SITE_KEY, initEvent(3));
        addEvent(GENERIC_SITE_KEY, initEvent(4));
        addEvent(GENERIC_SITE_KEY, initEvent(5));

        // The escaping fixture. `escape-percent` holds a literal `%` in `eventsType`, and
        // `escape-plain` starts with the same two digits without one, so a prefix of `50%` tells a
        // working escape from an ignored one: one node against two.
        addNode({
          parentPathOrId: `/sites/${GENERIC_SITE_KEY}/contents`,
          name: "queryBuilderEscape",
          primaryNodeType: "jnt:contentFolder",
        }).then(() => {
          addEvent(GENERIC_SITE_KEY, {
            parentPath: escapeScope,
            name: "escape-percent",
            title: "Escape percent",
            startDate: new Date(),
            eventsType: "50% off",
          });
          addEvent(GENERIC_SITE_KEY, {
            parentPath: escapeScope,
            name: "escape-plain",
            title: "Escape plain",
            startDate: new Date(),
            eventsType: "500 seats",
          });
        });

        // The node the reference cases compare against. Its `weakreference` property holds the
        // identifier of `event-1`, which is the only value both literal types can point at.
        getNodeByPath(event(1)).then((result) => {
          addNode({
            parentPathOrId: scope,
            name: "props",
            primaryNodeType: "javascriptExample:testGetNodeProps",
            properties: [
              {
                name: "weakreference",
                type: "WEAKREFERENCE",
                value: result.data.jcr.nodeByPath.uuid,
              },
            ],
          });
        });
      });
    });
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("formats the statement of every built query as the fork does", () => {
    visitView();

    for (const [testid, expected] of Object.entries(fragments)) {
      cy.get(`div[data-testid="testQueryBuilder_${testid}_statement"]`).should(($div) => {
        const statement = $div.text();
        for (const fragment of expected) {
          expect(statement, `${testid}: ${fragment}`).to.contain(fragment);
        }
      });
    }
  });

  it("inlines a bound value, so no bind variable name reaches the statement", () => {
    visitView();
    cy.get(`div[data-testid="testQueryBuilder_bind_statement"]`).should(($div) => {
      expect($div.text()).to.not.contain("since");
      expect($div.text()).to.not.contain("$");
    });
  });

  it("returns the node a property filter matches", () => {
    visitView();
    paths("property").should("deep.equal", [event(1)]);
  });

  it("returns every node under the path scope, in the order of the query", () => {
    visitView();
    paths("path").should("deep.equal", [event(1), event(2), event(3), event(4), event(5)]);
  });

  it("returns the page the limit and the offset select", () => {
    visitView();
    paths("page").should("deep.equal", [event(3), event(4)]);
  });

  it("returns every node a full text search matches", () => {
    visitView();
    paths("fullText").then((found) => {
      expect([...found].sort()).to.deep.equal([event(1), event(2), event(3), event(4), event(5)]);
    });
  });

  it("compares a typed date literal, and inlines a bound value as the same literal", () => {
    visitView();
    const expected = [event(1), event(2), event(3), event(4), event(5)];
    paths("date").then((found) => {
      expect([...found].sort()).to.deep.equal(expected);
    });
    paths("bind").then((found) => {
      expect([...found].sort()).to.deep.equal(expected);
    });
  });

  it("returns the left selector of a join once per matching row, as the statement path does", () => {
    visitView();
    // Jahia's wrapper does not deduplicate the left selector: the folder comes back once per child
    // event. The statement path returns the same list, so this is the product's behaviour and not
    // something the object model sink introduces.
    const repeated = [scope, scope, scope, scope, scope];
    paths("join").should("deep.equal", repeated);
    paths("joinStatement").should("deep.equal", repeated);
  });

  it("returns nothing for a LENGTH predicate over an internationalised property", () => {
    visitView();
    // `jcr:title` is internationalised on `jnt:event`, so its value lives on a `jnt:translation`
    // child. `LENGTH` is evaluated in memory against the node itself, which carries no value, so
    // the predicate matches nothing. The two probes below isolate the cause.
    paths("mixed").should("have.length", 0);
    paths("lengthOnI18n").should("have.length", 0);
    paths("lengthOnPlain").then((found) => {
      expect([...found].sort()).to.deep.equal([event(1), event(2), event(3), event(4), event(5)]);
    });
  });

  it("runs a query that mixes the facade, the factory and the in memory constructs", () => {
    visitView();
    paths("mixedPlain").should("deep.equal", [event(5), event(4), event(3), event(2)]);
  });

  it("runs UPPER, NOT and a LOWER ordering over an internationalised property", () => {
    visitView();
    // These three read the property through the index or through the ordering path, which both
    // resolve the translated value. Only the LENGTH predicate above does not.
    paths("upperOnI18n").should("deep.equal", [event(1)]);
    paths("notOnI18n").then((found) => {
      expect([...found].sort()).to.deep.equal([event(2), event(3), event(4), event(5)]);
    });
    paths("lowerOrderOnI18n").should("deep.equal", [
      event(5),
      event(4),
      event(3),
      event(2),
      event(1),
    ]);
  });

  it("folds a value list, a range and an absence test into index operators", () => {
    visitView();
    paths("predicates").then((found) => {
      expect([...found].sort()).to.deep.equal([event(1), event(2), event(3), event(4), event(5)]);
    });
  });

  it("escapes the LIKE wildcards of a startsWith prefix", () => {
    visitView();
    paths("startsWithPlain").then((found) => {
      expect([...found].sort()).to.deep.equal([event(1), event(2), event(3), event(4), event(5)]);
    });
    // `mee_ing` matches `meeting` when the underscore stays a wildcard, and nothing once it is
    // escaped, which is what this case reads.
    paths("startsWithWildcard").should("have.length", 0);
  });

  it("matches a literal percent sign in a startsWith prefix", () => {
    visitView();
    // The control first: the fixture folder holds two events whose `eventsType` starts with `50`.
    paths("startsWithDigits").then((found) => {
      expect([...found].sort()).to.deep.equal([percentEvent, plainEvent]);
    });
    // The prefix `50%` is written as `50\%%`. One node means the backslash escape works, two mean
    // the `%` stayed a wildcard, and none mean the backslash reached the index as a character.
    paths("startsWithPercent").should("deep.equal", [percentEvent]);
  });

  it("executes a reference literal exactly as a weak reference one", () => {
    visitView();
    // `JCRValueFactoryImpl` remaps REFERENCE to WEAKREFERENCE, so the two literals produce the same
    // cast and the same result.
    for (const testid of ["strongRef", "weakRef"]) {
      cy.get(`div[data-testid="testQueryBuilder_${testid}_statement"]`).should(($div) => {
        expect($div.text()).to.contain("AS WEAKREFERENCE");
        expect($div.text()).to.not.contain("AS REFERENCE");
      });
      paths(testid).should("deep.equal", [`${scope}/props`]);
    }
  });

  it("reads an approximate count through the rows of a result", () => {
    visitView();
    // The pattern the querying guide documents, run verbatim. The fixture holds five events, which
    // is below the approximation limit, so the estimate is exact and the flag is false.
    cy.get(`div[data-testid="testQueryBuilder_countProbe"]`).should(($div) => {
      expect($div.text()).to.equal("estimate=5 approxLimitReached=false");
    });
  });

  it("fails to bind a value on the object model path, which is why the sink inlines literals", () => {
    visitView();
    cy.get(`div[data-testid="testQueryBuilder_bindValueProbe"]`).should(($div) => {
      expect($div.text()).to.contain("Unknown bind variable");
    });
  });

  it("runs a NOT and an UPPER over a property, which the strict gate reports and lets through", () => {
    visitView();
    paths("negated").then((found) => {
      expect([...found].sort()).to.deep.equal([event(1), event(2), event(3), event(4), event(5)]);
    });
  });

  it("returns the same nodes for a built query and for the statement it mirrors", () => {
    visitView();
    const expected = [event(1), event(2), event(3)];
    paths("parityBuilt").should("deep.equal", expected);
    paths("parityStatement").should("deep.equal", expected);
  });

  it("returns the same page of an identifier ordered query on every run", () => {
    visitView();
    paths("stable").then((first) => {
      expect(first).to.have.length(2);
      visitView();
      paths("stable").should("deep.equal", first);
      visitView();
      paths("stable").should("deep.equal", first);
    });
  });
});
