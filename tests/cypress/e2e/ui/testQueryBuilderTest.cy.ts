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
 *
 * Every single selector case of the view is built without an alias, so its selector is named after
 * its node type and the formatter brackets that name. The two constants below hold the name each
 * case writes. The `FROM` fragment stops at the node type, because the formatter writes the `AS`
 * clause of a selector that carries the name of its own node type as it sees fit.
 */
describe("JCR query builder test", () => {
  const scope = `/sites/${GENERIC_SITE_KEY}/contents/queryBuilder`;
  const event = (index: number) => `${scope}/event-${index}`;
  const page = `/sites/${GENERIC_SITE_KEY}/home/queryBuilder`;

  /**
   * The pattern fixture, in its own folder so that its nodes never enter the counts the cases
   * scoped to `scope` assert.
   *
   * Its nodes are `testGetNodeProps` and not events. `jnt:event.eventsType` carries a value
   * constraint, `[meeting, consumerShow, roadShow, conference, show, pressConference]`, so writing
   * `50% off` on an event raises a `ConstraintViolationException` and the fixture cannot be created
   * at all. `smallText` and `multipleSmallText` carry no constraint and are not internationalised.
   */
  const patternScope = `/sites/${GENERIC_SITE_KEY}/contents/queryBuilderPattern`;
  const patternNode = (name: string) => `${patternScope}/pattern-${name}`;

  /** The selector name of a query built without an alias, as the formatter writes it. */
  const e = `[jnt:event]`;
  const n = `[javascriptExample:testGetNodeProps]`;

  /** What every statement of a single selector case holds, whatever the rewrite added. */
  const single = [`SELECT ${e}.*`, `FROM [jnt:event]`, `ISDESCENDANTNODE(${e}, ['${scope}'])`];

  /** The same fragments for a case scoped to the pattern fixture folder. */
  const singlePattern = [
    `SELECT ${n}.*`,
    `FROM [javascriptExample:testGetNodeProps]`,
    `ISDESCENDANTNODE(${n}, ['${patternScope}'])`,
  ];

  const fragments: Record<string, string[]> = {
    property: [...single, `[jcr:title] = 'Event 1'`],
    path: [...single, `ORDER BY`, `[jcr:title]`],
    page: [...single, `ORDER BY`, `[jcr:title]`],
    fullText: [...single, `CONTAINS(${e}.*, 'Event')`, `ORDER BY SCORE(${e}) DESC`],
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
      `NOT ISSAMENODE(${e}, ['${scope}/event-1'])`,
      `[jcr:title] LIKE 'Event%'`,
      `LOWER(`,
      `LENGTH(`,
      `> CAST('3' AS LONG)`,
      `ORDER BY LOWER(`,
      `DESC`,
    ],
    mixedPlain: [
      ...single,
      `NOT ISSAMENODE(${e}, ['${scope}/event-1'])`,
      `[jcr:title] LIKE 'Event%'`,
      `LENGTH(${e}.eventsType) > CAST('3' AS LONG)`,
      `ORDER BY LOWER(`,
    ],
    negated: [...single, `NOT `, `[jcr:language] IS NOT NULL`, `UPPER(`, `= 'MEETING'`],
    lengthOnPlain: [...single, `LENGTH(${e}.eventsType) > CAST('3' AS LONG)`],
    lengthOnI18n: [...single, `LENGTH(${e}.[jcr:title]) > CAST('3' AS LONG)`],
    upperOnI18n: [...single, `UPPER(${e}.[jcr:title]) = 'EVENT 1'`],
    notOnI18n: [...single, `NOT ${e}.[jcr:title] = 'Event 1'`],
    lowerOrderOnI18n: [...single, `ORDER BY LOWER(${e}.[jcr:title]) DESC`],
    lowerOrderOnPlain: [...single, `ORDER BY LOWER(${e}.eventsType) DESC`],
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
    // The pattern cases. Each escaped fragment holds the backslash the builder wrote, which the
    // formatter carries through: the only escape the SQL2 string literal grammar defines is the
    // doubled quote, so a backslash travels to the engine verbatim.
    startsWithLiteral: [...singlePattern, String.raw`smallText LIKE '50\%%'`],
    likeWildcard: [...singlePattern, `smallText LIKE '50%'`],
    startsWithUnderscore: [...singlePattern, String.raw`smallText LIKE 'mee\_ing%'`],
    likeUnderscore: [...singlePattern, `smallText LIKE 'mee_ing'`],
    startsWithBackslash: [...singlePattern, String.raw`smallText LIKE 'a\\b%'`],
    endsWithLiteral: [...singlePattern, `smallText LIKE '% off'`],
    containsLiteral: [...singlePattern, String.raw`smallText LIKE '%0\% o%'`],
    likeWholeValue: [...singlePattern, `smallText LIKE 'off'`],
    containsCased: [...singlePattern, `smallText LIKE '%eetu%'`],
    lowerContains: [...singlePattern, `LOWER(`, `LIKE '%eetu%'`],
    lowerContainsLiteral: [...singlePattern, `LOWER(`, String.raw`LIKE '%0\% o%'`],
    localNameEndsWith: [...singlePattern, `LOCALNAME(${n}) LIKE '%-percent'`],
    localNameContains: [...singlePattern, `LOCALNAME(${n}) LIKE '%-under%'`],
    multiContains: [...singlePattern, String.raw`multipleSmallText LIKE '%0\% o%'`],
    fullTextStem: [...singlePattern, `CONTAINS(`, `'seat')`],
    fullTextWildcard: [...singlePattern, `CONTAINS(`, `'seats*')`],
    // The two searches over the same terms. A `CONTAINS(` in a statement always comes from
    // `fullText()`, and a `LIKE` always comes from `contains()`, whatever the two words mean in
    // the GraphQL API.
    accentFullText: [...singlePattern, `CONTAINS(`, `'chateaux')`],
    accentFullTextAccented: [...singlePattern, `CONTAINS(`, `'châteaux')`],
    accentContains: [...singlePattern, `smallText LIKE '%chateaux%'`],
    accentContainsRaw: [...singlePattern, `smallText LIKE '%Châteaux%'`],
    accentWildcard: [...singlePattern, `CONTAINS(`, `'*hateau*')`],
    accentWildcardAccented: [...singlePattern, `CONTAINS(`, `'*hâteau*')`],
    caseFullText: [...singlePattern, `CONTAINS(`, `'MEETING')`],
    caseContains: [...singlePattern, `smallText LIKE '%MEETING%'`],
    starFullText: [...singlePattern, `CONTAINS(`, `'seat*')`],
    percentFullText: [...singlePattern, `CONTAINS(`, `'%seat%')`],
    starPercentFullText: [...singlePattern, `CONTAINS(`, `'%seat*%')`],
    starContains: [...singlePattern, `smallText LIKE '%seat*%'`],
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

        // The pattern fixture. One node per value the pattern language treats differently, so that
        // each case below separates a working escape from an ignored one by the node it returns
        // rather than by a count alone. The node names carry the same distinctions, which is what
        // the two `LOCALNAME` cases read.
        addNode({
          parentPathOrId: `/sites/${GENERIC_SITE_KEY}/contents`,
          name: "queryBuilderPattern",
          primaryNodeType: "jnt:contentFolder",
        }).then(() => {
          const withSmallText = (name: string, value: string) =>
            addNode({
              parentPathOrId: patternScope,
              name: `pattern-${name}`,
              primaryNodeType: "javascriptExample:testGetNodeProps",
              properties: [{ name: "smallText", value }],
            });

          withSmallText("percent", "50% off");
          withSmallText("plain", "500 seats");
          withSmallText("meeting", "meeting");
          withSmallText("underscore", "mee_ing");
          withSmallText("camel", "MeetUp");
          withSmallText("backslash", "a\\b");
          // The accented value the two searches disagree about. No other fixture value holds the
          // letters `hateau`, so every case that names them reads this node alone.
          withSmallText("accent", "Châteaux et Haras");

          addNode({
            parentPathOrId: patternScope,
            name: "pattern-multi",
            primaryNodeType: "javascriptExample:testGetNodeProps",
            properties: [{ name: "multipleSmallText", values: ["50% off", "zzz"] }],
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

  it("reads a backslash in a LIKE pattern as the escape character", () => {
    visitView();
    // The control first: an unescaped `%` is a wildcard, so both values that start with `50` come
    // back. A run where this one returns nothing is a broken fixture, not an escaping answer.
    paths("likeWildcard").then((found) => {
      expect([...found].sort()).to.deep.equal([patternNode("percent"), patternNode("plain")]);
    });
    // `startsWith("50%")` writes `50\%%`. One node means the backslash is the escape character the
    // JCR specification defines, two mean the `%` stayed a wildcard, and none mean the backslash
    // reached the index as a character.
    paths("startsWithLiteral").should("deep.equal", [patternNode("percent")]);

    // The same pair for the other wildcard, and for the backslash itself.
    paths("likeUnderscore").then((found) => {
      expect([...found].sort()).to.deep.equal([patternNode("meeting"), patternNode("underscore")]);
    });
    paths("startsWithUnderscore").should("deep.equal", [patternNode("underscore")]);
    paths("startsWithBackslash").should("deep.equal", [patternNode("backslash")]);
  });

  it("accepts a wildcard at the start of a pattern and in the middle of one", () => {
    visitView();
    // A leading wildcard is legal and is served by the index, which is why `endsWith` and
    // `contains` carry no `Slow` suffix.
    paths("endsWithLiteral").should("deep.equal", [patternNode("percent")]);
    // A surrounding wildcard, with an escaped `%` between the two, so both halves are read here.
    paths("containsLiteral").should("deep.equal", [patternNode("percent")]);
    // LIKE compares the whole stored value and not its terms: `off` alone matches no value.
    paths("likeWholeValue").should("have.length", 0);
    // A multi-valued property matches when any one of its values matches.
    paths("multiContains").should("deep.equal", [patternNode("multi")]);
  });

  it("matches case sensitively, unless a case transform is applied first", () => {
    visitView();
    // `MeetUp` holds `eetU` and not `eetu`, so the untransformed substring match returns nothing.
    paths("containsCased").should("have.length", 0);
    paths("lowerContains").should("deep.equal", [patternNode("camel")]);
    // The escape survives the transform, which uses a different term enumeration.
    paths("lowerContainsLiteral").should("deep.equal", [patternNode("percent")]);
  });

  it("takes the same pattern language on a local name", () => {
    visitView();
    paths("localNameEndsWith").should("deep.equal", [patternNode("percent")]);
    paths("localNameContains").should("deep.equal", [patternNode("underscore")]);
  });

  it("searches stemmed terms with fullText, which is not what contains does", () => {
    visitView();
    // Full text matches the stem the index holds, so the term `seat` finds the `500 seats` node.
    paths("fullTextStem").should("deep.equal", [patternNode("plain")]);
    // A wildcard term is not stemmed, so `seats*` misses that same stem and returns nothing. This
    // is why a substring match belongs to `contains()` and not to a full text wildcard.
    paths("fullTextWildcard").should("have.length", 0);
  });

  it("folds accents in a full text search, and folds nothing in a pattern", () => {
    visitView();
    // The positive control of the pair. The stored value is `Châteaux et Haras`, and the analysed
    // index holds it folded, so the unaccented term finds it. If this one returns nothing the
    // index is not answering and the empty results below say nothing at all.
    paths("accentFullText").should("deep.equal", [patternNode("accent")]);
    // The analyser folds the query term as well, so the accented term finds the same node.
    paths("accentFullTextAccented").should("deep.equal", [patternNode("accent")]);
    // The same term through the substring match finds nothing, because a pattern reads the stored
    // characters and folds nothing. This is the divergence a developer who arrives from the
    // GraphQL `nodesByCriteria` API walks into: there, `contains` is the search above.
    paths("accentContains").should("have.length", 0);
    // The second control: the pattern side does work, once the text carries the stored characters.
    paths("accentContainsRaw").should("deep.equal", [patternNode("accent")]);
  });

  it("skips the analyser for a wildcard term, so that term is not folded either", () => {
    visitView();
    // The index holds the folded token, so a wildcard term written without the accent reaches it.
    paths("accentWildcard").should("deep.equal", [patternNode("accent")]);
    // The same term written with the accent reaches nothing, because a term that carries a
    // wildcard is not analysed and no index token holds the accent. Fold the term yourself before
    // you wrap it in a star.
    paths("accentWildcardAccented").should("have.length", 0);
  });

  it("ignores case in a full text search, and respects it in a pattern", () => {
    visitView();
    // The index is lower case on both sides, so the upper case term finds the `meeting` value.
    paths("caseFullText").should("deep.equal", [patternNode("meeting")]);
    // A pattern compares the characters as they were written, so the same term finds nothing.
    paths("caseContains").should("have.length", 0);
  });

  it("reads * as the full text wildcard and % as the pattern wildcard, never the other way", () => {
    visitView();
    // The control: the index holds the stem `seat` for `500 seats`, which `fullTextStem` reads, so
    // the prefix term reaches it.
    paths("starFullText").should("deep.equal", [patternNode("plain")]);
    // A `%` is not a full text wildcard. It is an ordinary character, and the analyser splits the
    // term at it, so a `%` that wraps the term leaves the term itself and this returns what the
    // bare term returns rather than nothing.
    paths("percentFullText").should("deep.equal", [patternNode("plain")]);
    // Next to a star it is not harmless: a term carrying a `*` skips the analyser, so the `%` stays
    // inside the term and the expression that matched above now matches nothing.
    paths("starPercentFullText").should("have.length", 0);
    // The mirror image. A `*` inside a pattern is one more character to match, and no stored value
    // holds a star, so the substring match returns nothing.
    paths("starContains").should("have.length", 0);
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
