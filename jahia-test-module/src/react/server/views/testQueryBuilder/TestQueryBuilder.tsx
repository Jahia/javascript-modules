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
    server.render.addCacheDependency({ flushOnPathMatchingRegexp: `${scope}/.*` }, renderContext);

    // 1. A property filter, with the path scope every case shares.
    const property = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), e.prop("jcr:title").eq("Event 1")))
      .limit(20);

    // 2. A path scope on its own, ordered on a property.
    const all = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .orderBy(({ e }) => e.prop("jcr:title").asc());

    // 3. One page of the same query. The base is unchanged, because a builder is immutable.
    const page = all.limit(2).offset(2);

    // 4. Full text search, ordered on the relevance score. Both are native Lucene constructs.
    const fullText = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), e.contains("Event")))
      .orderBy(({ e }) => e.score().desc())
      .limit(10);

    // 5. A typed date literal.
    const dateLiteral = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), e.prop("startDate").ge(date(EPOCH))))
      .limit(10);

    // 6. The same query through a bind variable. The sink inlines the value as a typed literal, so
    // the statement is the one of case 5.
    const bind = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), e.prop("startDate").ge($("since"))))
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
    const mixed = from("jnt:event", "e")
      .where(({ e }) =>
        and(
          e.isDescendantOf(scope),
          not(e.isSameAs(`${scope}/event-1`)),
          or(
            e.prop("jcr:title").like("Event%"),
            qom.comparison(
              qom.lowerCase(qom.propertyValue("e", "jcr:title")),
              Operator.EQUAL_TO,
              literal("event 2"),
            ),
          ),
        ),
      )
      .whereSlow(({ e }) => e.prop("jcr:title").lengthSlow().gtSlow(3))
      .orderBySlow(({ e }) => e.prop("jcr:title").lower().descSlow())
      .limit(50);

    // The same constructs with the `LENGTH` predicate moved to `eventsType`, which the fixture sets
    // on every event and which is not internationalised. This is the case that returns rows.
    const mixedPlain = from("jnt:event", "e")
      .where(({ e }) =>
        and(
          e.isDescendantOf(scope),
          not(e.isSameAs(`${scope}/event-1`)),
          or(
            e.prop("jcr:title").like("Event%"),
            qom.comparison(
              qom.lowerCase(qom.propertyValue("e", "jcr:title")),
              Operator.EQUAL_TO,
              literal("event 2"),
            ),
          ),
        ),
      )
      .whereSlow(({ e }) => e.prop("eventsType").lengthSlow().gtSlow(3))
      .orderBySlow(({ e }) => e.prop("jcr:title").lower().descSlow())
      .limit(50);

    // 9. A NOT and an UPPER over a property. Both reach Jahia: they fail only for a property the
    // rewriter moves to a translation selector, which needs an internationalised property in a
    // localised session, and `diagnose()` reports that risk without refusing the query. The two
    // properties here are not internationalised. `jcr:language` is the one the snapshot loop of
    // the querying guide negates, and `eventsType` is set on every event of the fixture.
    const negated = from("jnt:event", "e")
      .where(({ e }) =>
        and(
          e.isDescendantOf(scope),
          not(e.prop("jcr:language").exists()),
          e.prop("eventsType").upper().eq("MEETING"),
        ),
      )
      .limit(10);

    // One literal of every type the builder can write. The query is never executed: it is here so
    // that the statement proves the value factory accepted each type code.
    const literals = from("jnt:event", "e")
      .where(({ e }) =>
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
    const lengthOnPlain = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .whereSlow(({ e }) => e.prop("eventsType").lengthSlow().gtSlow(3))
      .limit(10);
    const lengthOnI18n = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .whereSlow(({ e }) => e.prop("jcr:title").lengthSlow().gtSlow(3))
      .limit(10);
    const upperOnI18n = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), e.prop("jcr:title").upper().eq("EVENT 1")))
      .limit(10);
    const notOnI18n = from("jnt:event", "e")
      .where(({ e }) => and(e.isDescendantOf(scope), not(e.prop("jcr:title").eq("Event 1"))))
      .limit(10);

    // The same question for an in memory ordering, which reads the property once per hit.
    const lowerOrderOnI18n = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .orderBySlow(({ e }) => e.prop("jcr:title").lower().descSlow())
      .limit(10);
    const lowerOrderOnPlain = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .orderBySlow(({ e }) => e.prop("eventsType").lower().descSlow())
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
    const strongRef = from("javascriptExample:testGetNodeProps", "n")
      .where(({ n }) =>
        and(n.isDescendantOf(scope), n.prop("weakreference").eq(reference(referenced))),
      )
      .limit(10);
    const weakRef = from("javascriptExample:testGetNodeProps", "n")
      .where(({ n }) =>
        and(n.isDescendantOf(scope), n.prop("weakreference").eq(weakReference(referenced))),
      )
      .limit(10);

    // A page of a query ordered on the identifier, which is the stable tiebreaker.
    const stable = from("jnt:event", "e")
      .where(({ e }) => e.isDescendantOf(scope))
      .orderBy(({ e }) => e.prop("jcr:uuid").asc())
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
