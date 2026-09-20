import {
  $,
  and,
  date,
  decimal,
  double,
  from,
  getNodesByJCRQuery,
  jahiaComponent,
  literal,
  long,
  name,
  not,
  Operator,
  or,
  path,
  qom,
  reference,
  server,
  toQOM,
  uri,
  weakReference,
} from "@jahia/javascript-modules-library";
import type { Executable } from "@jahia/javascript-modules-library";
import type { Node } from "javax.jcr";
import type {
  Column,
  Constraint,
  Ordering,
  QueryObjectModel,
  QueryObjectModelFactory,
  Source,
} from "javax.jcr.query.qom";
import type { JCRSessionWrapper } from "org.jahia.services.content";

/**
 * The two factory members this file calls directly, with the slots the specification allows to be
 * empty widened to accept `null`. The generated declarations carry no nullability information, so
 * `qom.ts` narrows the same three members the same way. Only the bind variable probe below reaches
 * the factory directly: every other case of this view goes through the builder.
 */
interface QOMFactoryLike extends Omit<QueryObjectModelFactory, "createQuery" | "column"> {
  createQuery(
    source: Source,
    constraint: Constraint | null,
    orderings: Ordering[],
    columns: Column[],
  ): QueryObjectModel;
  column(selectorName: string, propertyName: string | null, columnName: string | null): Column;
}

/**
 * The date every event of the test fixture is after. It is a fixed value, so that the statement the
 * formatter writes is stable across runs.
 */
const EPOCH = "2000-01-01T00:00:00.000Z";

/** The far end of the range the `between` case uses, chosen so that every fixture event fits it. */
const HORIZON = "2099-01-01T00:00:00.000Z";

/**
 * Renders the JCR-SQL2 statement Jahia formats for a built query.
 *
 * `createQuery` rewrites the four parts before the object model exists, so this is the statement of
 * the rewritten query and not of the model the builder holds. In a localised session the rewrite
 * adds a `jcr:language` constraint to every selector that carries none.
 */
const PrintStatement = ({
  testid,
  session,
  query,
}: {
  testid: string;
  session: JCRSessionWrapper;
  query: Executable;
}) => (
  <div data-testid={`testQueryBuilder_${testid}_statement`}>
    {toQOM(query.build(), session, query.execution.bindings).getStatement()}
  </div>
);

/** Renders the path of every node a query returned, in the order the query returned them. */
const PrintNodes = ({ testid, nodes }: { testid: string; nodes: Node[] }) => (
  <div data-testid={`testQueryBuilder_${testid}`}>
    {nodes.map((node, index) => (
      <div data-testid={`testQueryBuilder_${testid}_${index + 1}`} key={node.getPath()}>
        {node.getPath()}
      </div>
    ))}
  </div>
);

/** Renders both the statement of a query and the nodes it returned. */
const PrintQuery = ({
  testid,
  session,
  query,
}: {
  testid: string;
  session: JCRSessionWrapper;
  query: Executable;
}) => (
  <>
    <h2>{testid}</h2>
    <PrintStatement testid={testid} session={session} query={query} />
    <PrintNodes testid={testid} nodes={getNodesByJCRQuery(session, query)} />
  </>
);

/**
 * Runs a bind variable on the object model path, the way a caller would if the sink did not inline
 * the value. It builds the query through `getQOMFactory()`, binds the variable through
 * `bindValue()` and executes it. The plan predicts that this fails, which is the reason the sink
 * replaces every variable with a typed literal before the factory call. The outcome is rendered as
 * text, so that the test reads what happened instead of losing the page to an exception.
 */
const PrintBindValueProbe = ({ session }: { session: JCRSessionWrapper }) => {
  let outcome: string;

  try {
    const factory = session
      .getWorkspace()
      .getQueryManager()
      .getQOMFactory() as unknown as QOMFactoryLike;
    const query = factory.createQuery(
      factory.selector("jnt:event", "e"),
      factory.comparison(
        factory.propertyValue("e", "eventsType"),
        Operator.EQUAL_TO,
        factory.bindVariable("kind"),
      ),
      [],
      [factory.column("e", null, null)],
    );
    query.bindValue("kind", session.getValueFactory().createValue("meeting"));

    const nodes = query.execute().getNodes();
    let found = 0;
    while (nodes.hasNext()) {
      nodes.nextNode();
      found += 1;
    }

    outcome = `executed, ${found} node(s)`;
  } catch (error) {
    outcome = `threw ${String(error)}`;
  }

  return <div data-testid="testQueryBuilder_bindValueProbe">{outcome}</div>;
};

/**
 * Runs the approximate count pattern the querying guide documents, exactly as the guide writes it.
 * There is no count API in the library, so the query goes through the session's own query manager
 * and reads the single row of the result. The outcome is rendered as text, so that the test reads
 * what happened instead of losing the page to an exception.
 */
const PrintCountProbe = ({ session, scope }: { session: JCRSessionWrapper; scope: string }) => {
  let outcome: string;

  try {
    const statement = `SELECT [rep:count(approximate=1)] FROM [jnt:event] AS n WHERE ISDESCENDANTNODE(n, ['${scope}'])`;
    const result = session
      .getWorkspace()
      .getQueryManager()
      .createQuery(statement, "JCR-SQL2")
      .execute();
    const row = result.getRows().nextRow();
    const estimate = row.getValue("rep:count(approximate=1)").getLong();
    const limitReached = row.getValue("approxLimitReached").getBoolean();
    outcome = `estimate=${estimate} approxLimitReached=${limitReached}`;
  } catch (error) {
    outcome = `threw ${String(error)}`;
  }

  return <div data-testid="testQueryBuilder_countProbe">{outcome}</div>;
};

jahiaComponent(
  {
    nodeType: "javascriptExample:testQueryBuilder",
    displayName: "Test query builder",
    componentType: "view",
  },
  (_, { currentNode, renderContext }) => {
    const session = currentNode.getSession();
    const siteKey = currentNode.getResolveSite().getSiteKey();
    const scope = `/sites/${siteKey}/contents/queryBuilder`;
    // The pattern fixture lives in its own folder, so that its nodes never enter the counts the
    // cases scoped to `scope` assert. Its nodes are `testGetNodeProps`, not events, because
    // `jnt:event.eventsType` carries a value constraint that refuses any value outside its list,
    // so a fixture value such as `50% off` cannot be written on an event at all. `smallText` and
    // `multipleSmallText` carry no constraint and are not internationalised.
    const patternScope = `/sites/${siteKey}/contents/queryBuilderPattern`;
    server.render.addCacheDependency({ flushOnPathMatchingRegexp: `${scope}/.*` }, renderContext);
    server.render.addCacheDependency(
      { flushOnPathMatchingRegexp: `${patternScope}/.*` },
      renderContext,
    );

    // 1. A property filter, with the path scope every case shares.
    const property = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), e.prop("jcr:title").eq("Event 1")))
      .limit(20);

    // 2. A path scope on its own, ordered on a property.
    const all = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .orderBy((e) => e.prop("jcr:title").asc());

    // 3. One page of the same query. The base is unchanged, because a builder is immutable.
    const page = all.limit(2).offset(2);

    // 4. Full text search, ordered on the relevance score. Both are native Lucene constructs.
    const fullText = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), e.fullText("Event")))
      .orderBy((e) => e.score().desc())
      .limit(10);

    // 5. A typed date literal.
    const dateLiteral = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), e.prop("startDate").ge(date(EPOCH))))
      .limit(10);

    // 6. The same query through a bind variable. The sink inlines the value as a typed literal, so
    // the statement is the one of case 5.
    const bind = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), e.prop("startDate").ge($("since"))))
      .limit(10)
      .bind({ since: date(EPOCH) });

    // 7. A join, which runs in memory on both sides. The result holds the nodes of the left
    // selector, one per matching row: the lab shows that Jahia's wrapper does not deduplicate them,
    // on this path or on the statement path, so the folder appears once per child event.
    const join = from("jnt:contentFolder", "p")
      .joinSlow("jnt:event", "c")
      .on(({ c, p }) => c.isChildOf(p))
      .where(({ p }) => p.isSameAs(scope))
      .select(
        ({ p }) => p.all(),
        ({ c }) => c.prop("jcr:title").as("childTitle"),
      )
      .limit(20);

    // 8. Facade and factory mixed, with a NOT, an OR, a LENGTH predicate and a LOWER ordering. The
    // last two run in memory, which is why they carry the `Slow` suffix. The NOT is applied to a
    // path constraint, so that the case excludes one known node whatever the site holds. The
    // `negated` case below negates a property instead.
    //
    // This case returns nothing in a localised session, because `jcr:title` is internationalised
    // and `LENGTH` reads the property from the node itself, where a translated value does not
    // live. The `lengthOnI18n` and `lengthOnPlain` probes below isolate that, and `mixedPlain`
    // repeats this case over a property that is not internationalised.
    const mixed = from("jnt:event")
      .where((e) =>
        and(
          e.isDescendantOf(scope),
          not(e.isSameAs(`${scope}/event-1`)),
          or(
            e.prop("jcr:title").like("Event%"),
            qom.comparison(
              qom.lowerCase(qom.propertyValue("jnt:event", "jcr:title")),
              Operator.EQUAL_TO,
              literal("event 2"),
            ),
          ),
        ),
      )
      .whereSlow((e) => e.prop("jcr:title").lengthSlow().gtSlow(3))
      .orderBySlow((e) => e.prop("jcr:title").lower().descSlow())
      .limit(50);

    // The same constructs with the `LENGTH` predicate moved to `eventsType`, which the fixture sets
    // on every event and which is not internationalised. This is the case that returns rows.
    const mixedPlain = from("jnt:event")
      .where((e) =>
        and(
          e.isDescendantOf(scope),
          not(e.isSameAs(`${scope}/event-1`)),
          or(
            e.prop("jcr:title").like("Event%"),
            qom.comparison(
              qom.lowerCase(qom.propertyValue("jnt:event", "jcr:title")),
              Operator.EQUAL_TO,
              literal("event 2"),
            ),
          ),
        ),
      )
      .whereSlow((e) => e.prop("eventsType").lengthSlow().gtSlow(3))
      .orderBySlow((e) => e.prop("jcr:title").lower().descSlow())
      .limit(50);

    // 9. A NOT and an UPPER over a property. Both reach Jahia: they fail only for a property the
    // rewriter moves to a translation selector, which needs an internationalised property in a
    // localised session, and `diagnose()` reports that risk without refusing the query. The two
    // properties here are not internationalised. `jcr:language` is the one the snapshot loop of
    // the querying guide negates, and `eventsType` is set on every event of the fixture.
    const negated = from("jnt:event")
      .where((e) =>
        and(
          e.isDescendantOf(scope),
          not(e.prop("jcr:language").exists()),
          e.prop("eventsType").upper().eq("MEETING"),
        ),
      )
      .limit(10);

    // One literal of every type the builder can write. The query is never executed: it is here so
    // that the statement proves the value factory accepted each type code.
    const literals = from("jnt:event")
      .where((e) =>
        and(
          e.isDescendantOf(scope),
          or(
            e.prop("stringProp").eq("text"),
            e.prop("longProp").eq(long(3)),
            e.prop("doubleProp").eq(double(1.5)),
            e.prop("decimalProp").eq(decimal("1.5")),
            e.prop("dateProp").eq(date(EPOCH)),
            e.prop("booleanProp").eq(true),
            e.prop("nameProp").eq(name("jnt:event")),
            e.prop("pathProp").eq(path("/sites")),
            e.prop("referenceProp").eq(reference("11111111-1111-1111-1111-111111111111")),
            e.prop("weakProp").eq(weakReference("22222222-2222-2222-2222-222222222222")),
            e.prop("uriProp").eq(uri("https://www.jahia.com")),
          ),
        ),
      )
      .limit(1);

    // The built query emits one wildcard column per selector, and the parsed statement emits none.
    // Both must return the same nodes, on a site with several languages as well, and the limit is
    // below the number of nodes so that a doubled hit stream would show.
    const parityBuilt = all.limit(3);
    const parityStatement = `SELECT * FROM [jnt:event] AS e WHERE ISDESCENDANTNODE(e, ['${scope}']) ORDER BY e.[jcr:title]`;

    // The same join, written as a JCR-SQL2 statement. Both paths reach the same Jahia wrapper, so
    // the two cases say whether the wrapper deduplicates the left selector of a join or whether it
    // yields one row per match.
    const joinStatement = `SELECT p.*, c.[jcr:title] AS childTitle FROM [jnt:contentFolder] AS p INNER JOIN [jnt:event] AS c ON ISCHILDNODE(c, p) WHERE ISSAMENODE(p, ['${scope}'])`;

    // Four probes that isolate what an in memory operand does over an internationalised property.
    // `jcr:title` is internationalised on `jnt:event`, so Jahia keeps its value on a `jnt:translation`
    // child, while `eventsType` is a plain property of the node itself. The plan expects `NOT` and
    // `UPPER` to fail over a property the rewrite moves to a translation selector, and says nothing
    // about `LENGTH`. Each probe changes one thing only.
    const lengthOnPlain = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .whereSlow((e) => e.prop("eventsType").lengthSlow().gtSlow(3))
      .limit(10);
    const lengthOnI18n = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .whereSlow((e) => e.prop("jcr:title").lengthSlow().gtSlow(3))
      .limit(10);
    const upperOnI18n = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), e.prop("jcr:title").upper().eq("EVENT 1")))
      .limit(10);
    const notOnI18n = from("jnt:event")
      .where((e) => and(e.isDescendantOf(scope), not(e.prop("jcr:title").eq("Event 1"))))
      .limit(10);

    // The same question for an in memory ordering, which reads the property once per hit.
    const lowerOrderOnI18n = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .orderBySlow((e) => e.prop("jcr:title").lower().descSlow())
      .limit(10);
    const lowerOrderOnPlain = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .orderBySlow((e) => e.prop("eventsType").lower().descSlow())
      .limit(10);

    // The reference literal check. `JCRValueFactoryImpl` remaps REFERENCE to WEAKREFERENCE, so a
    // `reference()` literal is expected to behave exactly like a `weakReference()` one: the same
    // cast in the statement and the same nodes in the result. The fixture puts one
    // `testGetNodeProps` node under the scope whose `weakreference` property holds the identifier
    // of `event-1`. A missing fixture falls back to an identifier no node carries, so the page
    // still renders and the two cases still return the same, empty, result.
    const referenced = session.nodeExists(`${scope}/event-1`)
      ? session.getNode(`${scope}/event-1`).getIdentifier()
      : "00000000-0000-0000-0000-000000000000";
    const strongRef = from("javascriptExample:testGetNodeProps")
      .where((n) => and(n.isDescendantOf(scope), n.prop("weakreference").eq(reference(referenced))))
      .limit(10);
    const weakRef = from("javascriptExample:testGetNodeProps")
      .where((n) =>
        and(n.isDescendantOf(scope), n.prop("weakreference").eq(weakReference(referenced))),
      )
      .limit(10);

    // 10. The folded predicates, all four in one query. Each folds into index operators, so
    // `where()` takes them. `eventsType` is `meeting` on every event of the fixture and it is not
    // internationalised, and no event carries `jcr:language` on the node itself.
    const predicates = from("jnt:event")
      .where((e) =>
        and(
          e.isDescendantOf(scope),
          e.prop("eventsType").in(["meeting", "webinar"]),
          e.prop("startDate").between(date(EPOCH), date(HORIZON)),
          e.prop("jcr:language").notExists(),
        ),
      )
      .limit(10);

    // 11. The pattern surface, over the pattern fixture folder. Every case below was first read on
    // a live Jahia 8.2.3.2 carrying the Jackrabbit fork `2.22.0-jahia1`, and each one pins one
    // measured property of the engine rather than an assumption about it.
    //
    // The fixture holds one `testGetNodeProps` node per interesting value: `50% off`, `500 seats`,
    // `meeting`, `mee_ing`, `MeetUp` and `a\b`, plus one node whose multi-valued `multipleSmallText`
    // holds `50% off` next to an unrelated value.
    const patternBase = from("javascriptExample:testGetNodeProps");

    // `startsWith("50%")` writes `50\%%`. One node means the backslash is the escape character the
    // JCR specification defines, two mean the `%` stayed a wildcard, and none mean the backslash
    // reached the index as a character. It returned one node, the `50% off` one.
    const startsWithLiteral = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").startsWith("50%")))
      .limit(10);
    // The control, with the wildcard written on purpose through the raw pattern method. It must
    // return both `50% off` and `500 seats`, so a run that returns nothing for both cases is a
    // broken fixture and not an answer about the escaping.
    const likeWildcard = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").like("50%")))
      .limit(10);
    // The same pair for the other wildcard. The escaped form selects `mee_ing` alone, the raw one
    // selects `meeting` as well, which is what makes `_` a wildcard and the escape real.
    const startsWithUnderscore = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").startsWith("mee_ing")))
      .limit(10);
    const likeUnderscore = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").like("mee_ing")))
      .limit(10);
    // An escaped backslash matches one literal backslash, which is the third escape.
    const startsWithBackslash = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").startsWith("a\\b")))
      .limit(10);
    // The leading wildcard, which the engine accepts and serves from the index.
    const endsWithLiteral = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").endsWith(" off")))
      .limit(10);
    // The surrounding wildcard, with an escaped `%` in the middle of the text.
    const containsLiteral = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").contains("0% o")))
      .limit(10);
    // `LIKE` compares the whole stored value and not its terms, so a substring needs `contains()`.
    const likeWholeValue = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").like("off")))
      .limit(10);
    // `LIKE` is case sensitive, and the case transform is how a caller opts out of that. The first
    // case returns nothing and the second returns the `MeetUp` node.
    const containsCased = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").contains("eetu")))
      .limit(10);
    const lowerContains = patternBase
      .where((n) =>
        and(n.isDescendantOf(patternScope), n.prop("smallText").lower().contains("eetu")),
      )
      .limit(10);
    // The escape survives the case transform, which uses a different term enumeration.
    const lowerContainsLiteral = patternBase
      .where((n) =>
        and(n.isDescendantOf(patternScope), n.prop("smallText").lower().contains("0% o")),
      )
      .limit(10);
    // A local name takes the same pattern language, leading wildcard included.
    const localNameEndsWith = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.localName().endsWith("-percent")))
      .limit(10);
    const localNameContains = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.localName().contains("-under")))
      .limit(10);
    // A multi-valued property matches when any one of its values matches.
    const multiContains = patternBase
      .where((n) =>
        and(n.isDescendantOf(patternScope), n.prop("multipleSmallText").contains("0% o")),
      )
      .limit(10);
    // Full text is the other pattern language, and it is not the same one. It matches stemmed
    // terms, so the term `seat` finds the `500 seats` node, while `contains("seat")` finds it only
    // because those four characters are there. The wildcard form is not stemmed, so `seats*` misses
    // the stem the index holds and returns nothing.
    const fullTextStem = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").fullText("seat")))
      .limit(10);
    const fullTextWildcard = patternBase
      .where((n) => and(n.isDescendantOf(patternScope), n.prop("smallText").fullText("seats*")))
      .limit(10);

    // A page of a query ordered on the identifier, which is the stable tiebreaker.
    const stable = from("jnt:event")
      .where((e) => e.isDescendantOf(scope))
      .orderBy((e) => e.prop("jcr:uuid").asc())
      .limit(2)
      .offset(2);

    return (
      <>
        <h3>Query builder usages</h3>

        <PrintQuery testid="property" session={session} query={property} />
        <PrintQuery testid="path" session={session} query={all.limit(50)} />
        <PrintQuery testid="page" session={session} query={page} />
        <PrintQuery testid="fullText" session={session} query={fullText} />
        <PrintQuery testid="date" session={session} query={dateLiteral} />
        <PrintQuery testid="bind" session={session} query={bind} />
        <PrintQuery testid="join" session={session} query={join} />
        <PrintQuery testid="mixed" session={session} query={mixed} />
        <PrintQuery testid="mixedPlain" session={session} query={mixedPlain} />
        <PrintQuery testid="negated" session={session} query={negated} />

        <h2>literals</h2>
        <PrintStatement testid="literals" session={session} query={literals} />

        <h2>parity</h2>
        <PrintNodes testid="parityBuilt" nodes={getNodesByJCRQuery(session, parityBuilt)} />
        <PrintNodes
          testid="parityStatement"
          nodes={getNodesByJCRQuery(session, parityStatement, 3)}
        />

        <h2>joinStatement</h2>
        <PrintNodes testid="joinStatement" nodes={getNodesByJCRQuery(session, joinStatement, 20)} />

        <PrintQuery testid="lengthOnPlain" session={session} query={lengthOnPlain} />
        <PrintQuery testid="lengthOnI18n" session={session} query={lengthOnI18n} />
        <PrintQuery testid="upperOnI18n" session={session} query={upperOnI18n} />
        <PrintQuery testid="notOnI18n" session={session} query={notOnI18n} />
        <PrintQuery testid="lowerOrderOnI18n" session={session} query={lowerOrderOnI18n} />
        <PrintQuery testid="lowerOrderOnPlain" session={session} query={lowerOrderOnPlain} />

        <PrintQuery testid="predicates" session={session} query={predicates} />
        <PrintQuery testid="startsWithLiteral" session={session} query={startsWithLiteral} />
        <PrintQuery testid="likeWildcard" session={session} query={likeWildcard} />
        <PrintQuery testid="startsWithUnderscore" session={session} query={startsWithUnderscore} />
        <PrintQuery testid="likeUnderscore" session={session} query={likeUnderscore} />
        <PrintQuery testid="startsWithBackslash" session={session} query={startsWithBackslash} />
        <PrintQuery testid="endsWithLiteral" session={session} query={endsWithLiteral} />
        <PrintQuery testid="containsLiteral" session={session} query={containsLiteral} />
        <PrintQuery testid="likeWholeValue" session={session} query={likeWholeValue} />
        <PrintQuery testid="containsCased" session={session} query={containsCased} />
        <PrintQuery testid="lowerContains" session={session} query={lowerContains} />
        <PrintQuery testid="lowerContainsLiteral" session={session} query={lowerContainsLiteral} />
        <PrintQuery testid="localNameEndsWith" session={session} query={localNameEndsWith} />
        <PrintQuery testid="localNameContains" session={session} query={localNameContains} />
        <PrintQuery testid="multiContains" session={session} query={multiContains} />
        <PrintQuery testid="fullTextStem" session={session} query={fullTextStem} />
        <PrintQuery testid="fullTextWildcard" session={session} query={fullTextWildcard} />

        <PrintQuery testid="strongRef" session={session} query={strongRef} />
        <PrintQuery testid="weakRef" session={session} query={weakRef} />

        <h2>bindValueProbe</h2>
        <PrintBindValueProbe session={session} />

        <h2>countProbe</h2>
        <PrintCountProbe session={session} scope={scope} />

        <PrintQuery testid="stable" session={session} query={stable} />
      </>
    );
  },
);
