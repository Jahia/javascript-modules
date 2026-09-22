# @jahia/javascript-modules-library

This library exposes common types and utility functions for JavaScript modules running in a Jahia environment. It exposes the following APIs:

## Rendering components

### `Island`

This component creates an island of interactivity on the page, following the [Island Architecture](https://www.jahia.com/blog/leveraging-the-island-architecture-in-jahia-cms) paradigm.

```tsx
<Island component={MyComponent} props={{ foo: "bar" }}>
  <div>If MyComponent takes children, it will receive them here.</div>
</Island>
```

It takes an optional `clientOnly` prop:

- By default or when set to `false`, the component will be rendered on the server and hydrated in
  the browser. In this case, children are passed to the component.
- When set to `true`, the component will be rendered only in the browser, skipping the server-side
  rendering step. This is useful for components that cannot be rendered on the server. In this
  case, children are used as a placeholder until the component is hydrated.

### `Render`

This component renders a Jahia component out of a node or a JS object.

```tsx
// Render a JCR node
<Render node={node} />

// Render a JS object
<Render content={{ nodeType: "ns:nodeType" }}>
```

### `RenderChild`

This component renders a child node of the current node. It's a thin wrapper around `Render` and `AddContentButtons`.

```tsx
<RenderChild name="child" />
```

### `RenderChildren`

This component renders all children of the current node. It's a thin wrapper around `Render`, `getChildNodes` and `AddContentButtons`.

```tsx
<RenderChildren />
```

## Components

### `AbsoluteArea`

This component creates an absolute area in the page. It's an area of user-contributable content, child of the node of your choice.

```tsx
<AbsoluteArea name="footer" parent={renderContext.getSite().getHome()} />
```

### `Area`

This component creates an area in the page. It's an area of user-contributable content that is local to the page where it is present.

```tsx
<Area name="main" />
```

### `AddContentButtons`

This component renders a set of buttons to add content to the current node.

```tsx
<AddContentButtons />
```

### `AddResources`

This component adds resources to the page, making sure they are loaded only once and insert them at the desired position.

```tsx
<AddResources type="css" resources="styles.css" />
```

### `JImage`

Renders an image node with best-in-class responsive behaviors.

```tsx
<JImage src={imageNode} />
```

If `alt` is not provided, it defaults to the image's `jcr:title` property, and if none is set, the image is considered decorative (`alt=""` is produced).

This snippet produces something like the following HTML:

```html
<img
  src="/files/default/sites/mysite/files/image.jpg?w=376"
  srcset="
    /files/default/sites/mysite/files/image.jpg?w=2048 2048w,
    /files/default/sites/mysite/files/image.jpg?w=1680 1680w,
    /files/default/sites/mysite/files/image.jpg?w=1366 1366w,
    /files/default/sites/mysite/files/image.jpg?w=724   724w,
    /files/default/sites/mysite/files/image.jpg?w=424   424w,
    /files/default/sites/mysite/files/image.jpg?w=376   376w
  "
  sizes="auto, 100vw"
  width="3000"
  height="2000"
  alt="Image Title"
  loading="lazy"
/>
```

On a default Jahia instance, all `?w=` URLs will serve the original image. Your production instance requires a DAM ([Cloudinary](https://www.jahia.com/integrations/cloudinary), [Keepeek](https://www.jahia.com/integrations/keepeek)) or an image resizer ([Cloudimage](https://www.jahia.com/integrations/cloudimage)) for the responsive behavior to work correctly.

Images are lazy-loaded by default. For the image above the fold, typically the hero, tell the browser to fetch it first:

```tsx
<JImage src={heroImage} loading="eager" fetchPriority="high" />
```

Every other `<img />` attribute (`className`, `id`, `fetchPriority`, `decoding`, ...) is passed through as is.

## Declaration and registration

### `jahiaComponent`

This function is used to declare a Jahia component. It takes a component definition as first argument, and a React component as second argument.

```tsx
jahiaComponent(
  {
    componentType: "view",
    nodeType: "ns:hello",
  },
  ({ name }: { name: string }) => {
    return <h1>Hello {name}!</h1>;
  },
);
```

The first argument of the component function is an object containing the JCR properties of the node being rendered. The server context is passed as the second argument. See `useServerContext` for more information.

## Hooks

### `useGQLQuery`

This hook is used to execute a GraphQL query on the current Jahia instance.

```tsx
const { data, errors } = useGQLQuery({
  query: /* GraphQL */ `
    query MyQuery($workspace: Workspace!) {
      jcr(workspace: $workspace) {
        workspace
      }
    }
  `,
  variables: {
    workspace: "LIVE",
  },
});
```

`useGQLQuery` supports typed document nodes from [@graphql-typed-document-node/core](https://github.com/dotansimha/graphql-typed-document-node), but the JavaScript Modules Library is not prescriptive regarding GraphQL type generation and client-side usage. Here are some tools that can be used to generate types for your GraphQL queries:

- [gql.tada](https://gql-tada.0no.co/)
- [GraphQL Codegen](https://the-guild.dev/graphql/codegen/docs/getting-started)

On the client, you can use your favorite GraphQL client, such as [Apollo Client](https://www.apollographql.com/docs/react/) or [urql](https://nearform.com/open-source/urql/docs/).

### `useJCRQuery`

This hook is used to execute a JCR query on the current Jahia instance.

```tsx
// A JCR SQL2 statement, with the limit it must not exceed
const pages = useJCRQuery({ query: "SELECT * FROM [jnt:page]", limit: 20 });

// A query built with `from()`, which carries its own limit and offset
const news = useJCRQuery({
  query: from("jnt:news").limit(10).offset(20),
});
```

The form without a `limit` is deprecated, and it now throws a `QueryError` whose code is `UNSUPPORTED`. It used to return every node the query matches, which is slow and memory consuming on a large repository. Pass a `limit`, pass `-1` when you really want every matching node, or pass a built query, which carries its own. See [Query builder](#query-builder).

### `useServerContext`

This hook is used to access the server context, which contains information about the current node, page, and rendering context.

```tsx
const {
  /**
   * Jahia's rendering context, it provides access to all kinds of context information, such as the
   * current request, response, user, mode, mainResource and more
   */
  renderContext,
  /**
   * The current resource being rendered, which is a combination of the current node and its
   * template/view information
   */
  currentResource,
  /** The current JCR node being rendered */
  currentNode,
  /** The main JCR node being rendered, which is the root node of the current page */
  mainNode,
  /** The OSGi bundle key of the current module being rendered */
  bundleKey,
} = useServerContext();
```

You do not need to use this hook when rendering a component with `jahiaComponent`, as the server context is passed as the second argument of the component function.

## JCR utils

### `getChildNodes`

This function is used to get the child nodes of a JCR node.

```tsx
const children = getChildNodes(node, limit, offset, filter);
```

### `getNodeProps`

This function is used to get the properties of a JCR node.

```tsx
const { title, description } = getNodeProps(node, ["title", "description"]);
```

### `getNodesByJCRQuery`

This function is used to get nodes by a JCR query.

```tsx
// A JCR SQL2 statement, with its limit and its offset
const pages = getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]", limit, offset);

// A built query carries its own limit and offset, so both parameters are left out
const news = getNodesByJCRQuery(session, from("jnt:news").limit(10).offset(20));
```

A built query must have a limit before it is accepted here, and the compiler enforces it. A positional `limit` or `offset` next to a built query that carries one throws a `QueryError` whose code is `LIMIT_CONFLICT`. Only one of the two values could win.

## Query builder

This group builds a JCR query as a typed object instead of a JCR SQL2 string. The model mirrors `javax.jcr.query.qom.QueryObjectModel`, which is the level Jahia hands to its Lucene translation. No value is concatenated into a statement, and no string is parsed back.

```tsx
import { from, getNodesByJCRQuery } from "@jahia/javascript-modules-library";

const news = from("jnt:news")
  .where((n) => n.isDescendantOf("/sites/acme/contents"))
  .orderBy((n) => n.prop("date").desc())
  .limit(10);

const nodes = getNodesByJCRQuery(session, news);
// SELECT [jnt:news].* FROM [jnt:news] WHERE ISDESCENDANTNODE([jnt:news], ['/sites/acme/contents']) ORDER BY [jnt:news].date DESC
```

A selector that carries no alias is named after its node type, which is the name the statement above repeats. A query with no explicit column names one wildcard column per selector, which is why every statement below starts with that name and a `.*` and not with `SELECT *`. That column is what makes Jahia's internationalization rewrite see the selector, so a built query and the statement it mirrors return the same nodes. The statements in this file are the ones the formatter writes for the model as it is built. A localized session adds a `jcr:language` constraint to every selector.

Three rules shape this API:

- A builder is immutable. Every call returns a new builder, so one base serves several pages: `news.offset(10)` and `news.offset(20)` are two queries and the base is unchanged.
- A name that ends in `Slow` produces a construct that Jahia's query engine evaluates in memory instead of in the Lucene index. `where()` and `orderBy()` refuse such a construct, `whereSlow()` and `orderBySlow()` accept it, so the cost of a query is visible where it is written.
- A query cannot be executed before `limit(n)` or `unboundedSlow()` was called. The compiler refuses such a query, and the execution seams throw `UNSUPPORTED` when one reaches them anyway, so the rule holds for a JavaScript caller as well. It does not reach a query executed through the host object that `toQOM` returns, which is outside the library.

The guide `docs/2-guides/4-querying/README.md` covers pagination, total counts and the traps of a localized site. This API is experimental for one minor version, so its shape can still change.

### `$`

This function creates a bind variable, which the query carries until `bind()` gives it a value. It is the short name of `bindVariable`.

```tsx
const upcoming = from("jnt:event")
  .where((e) => e.prop("startDate").ge($("since")))
  .limit(5);

getNodesByJCRQuery(session, upcoming.bind({ since: new Date() }));
```

The sink replaces each variable with a typed literal before it calls the host. A variable without a value throws a `QueryError` whose code is `UNBOUND_VARIABLE`, before the query reaches Jahia.

### `and`

This function combines constraints with `AND`. It takes one constraint or more, and one constraint folds to itself.

```tsx
from("jnt:page")
  .where((p) => and(p.prop("j:published").eq(true), p.prop("jcr:title").like("A%")))
  .limit(20);
```

### `date`

This function creates a `DATE` literal out of a `Date` or an ISO 8601 string that carries milliseconds and a zone. A string without a time or without milliseconds is refused, because Jackrabbit reads the string at fixed offsets, so `date("2026-09-01")` throws.

```tsx
from("jnt:event")
  .where((e) => e.prop("startDate").ge(date("2026-09-01T00:00:00.000+02:00")))
  .limit(100);
```

### `decimal`

This function creates a `DECIMAL` literal out of a number, a bigint or a string. Use it when the property is a decimal, so that the value is not compared as a double.

### `diagnose`

This function reports what the model cannot show at a glance. It returns one entry per finding, with a `level` of `none`, `partial`, `deep-offset`, `full-scan` or `environment`, the place in the model, and the reason.

```tsx
for (const { level, at, reason } of query.diagnose()) {
  console.warn(`${level} at ${at}: ${reason}`);
}
```

`none` means the query fails at execution, and `build({ strict: true })` throws on such a finding. A `none` finding that also carries `conditional: true` fails only under a condition the model cannot see. One such condition is an internationalized property, so the finding is reported and the query still runs. `full-scan` covers a join, an unbounded execution and a `rep:facet` or exact `rep:count` column. `environment` means that a setting decides the cost: an ordering raises it for the native sort setting, and an offset raises it for the extra JCR providers. Every ordered query therefore carries one `environment` entry at `orderings`, which is a note about the installation and not a problem with the query.

A query with nothing to report returns an empty list, so `if (findings.length)` is a signal.

### `double`

This function creates a `DOUBLE` literal out of a number, a bigint or a string. A number that is not an integer already infers `DOUBLE`, so this constructor is for the cases where the inference is not what you want.

### `from`

This function starts a query over one node type. Each callback then receives the selector of that node type, and the call site names it.

```tsx
from("jnt:page")
  .where((p) => p.prop("jcr:title").eq("Home"))
  .limit(20);
// SELECT [jnt:page].* FROM [jnt:page] WHERE [jnt:page].[jcr:title] = 'Home'
```

A second argument names the selector. The callbacks then receive a record keyed by that alias, as in `.where(({ p }) => ...)`. A join names both of its sides, so it needs a builder that was started with an alias. On a builder started without one, the compiler refuses the node type passed to `joinSlow` and prints what to call instead. The join example at the end of this section is written that way.

It also lifts a model that `qom.createQuery` built, so that the factory and the builder mix in one query.

The builder has `where`, `whereSlow`, `orderBy`, `orderBySlow`, `select`, `joinSlow`, `limit`, `unboundedSlow`, `offset`, `bind`, `build` and `diagnose`. `select` names the columns of the statement and changes nothing the two seams hand back: both return the nodes of the left selector whatever the columns say. The callback receives the one selector reference of a query that declared no alias, and a record of one reference per alias otherwise. A reference gives `prop(name)`, `fullText(expression)`, `all()`, `isDescendantOf(path)`, `isChildOf(path)`, `isSameAs(path)`, `name()`, `localName()` and `score()`.

`fullText` runs a JCR full text search over the analysed index. It matches whole terms and it is not a substring match, which is what `contains` means in Prisma and in Drizzle. The terms are stemmed and lower case, so `fullText("seat")` finds a value of `500 seats` while `fullText("seats*")` finds nothing, because a wildcard term is not stemmed and the index holds the stem. The index folds accents too, so `fullText("chateaux")` and `fullText("châteaux")` both find "Châteaux et Haras" while a wildcard term folds nothing and `fullText("*hâteau*")` finds nothing. Use `contains` for a substring of the characters of one property.

Jahia's GraphQL `nodesByCriteria` API names these two operators the other way round: its `contains` is the full text search and its `like` is the raw pattern match. Translating a query therefore means swapping the word: GraphQL `contains: "term"` is `fullText("term")` here, and GraphQL `like: "%term%"` is `contains("term")`. A call that reads `contains("term")` matches raw characters, folds no accent and is case sensitive, so it returns less than the GraphQL `contains` would and reports no error while it does so.

The default operator between two terms of an expression is `AND`, so `fullText("chateaux zzzznomatch")` matches nothing and a search box that forwards several words asks for a node that holds every one of them.

The two searches read two different wildcard alphabets, and neither translates. The full text wildcard is `*`, and the pattern wildcards are `%` and `_`. A `%` inside a full text expression is an ordinary character, and the analyser splits the term at it: `fullText("%chateaux%")` searches for `chateaux`, while `fullText("ho%me")` asks for `ho` and `me` together and matches nothing where `fullText("home")` matches. A term that carries a `*` skips the analyser, so there the `%` stays in the term and `fullText("%priv*%")` matches nothing where `fullText("priv*")` matches. A `*` inside a pattern is one more character to match. The expression reaches Jahia as it was written, and the parser rejects `privacy!`, `foo(`, an unclosed quotation mark, a bare `OR`, `--` and an empty term with `javax.jcr.RepositoryException: Invalid full text search expression`, raised inside `execute()` and taking down the clauses beside it. `diagnose` reads a literal expression and reports four shapes at level `none`, so `build({ strict: true })` and `executeQuery` refuse the query before it reaches Jahia, and it reports a `%` at level `partial`. The four are: no term left once the operators are removed, an odd number of quotation marks, a parenthesis that does not pair up outside a quoted phrase, and an operator missing the term it needs, which is a trailing `-`, `+`, `!` or `OR`, or a leading `OR`, `&&` or `||`. Each rule is the narrow form, fitted to 195 expressions run against Jahia 8.2.3.2, because refusing a legal query costs more than missing an illegal one: `home -` is reported while `home-`, `home - `, `C++`, `&&&`, a bare `AND`, `"a (b" home` and a trailing backslash are all left alone, and each of those runs. The builder rewrites nothing, so sanitise text a visitor typed before you build the clause.

`like(pattern)` is the one pattern match the JCR defines, and no regular expression exists anywhere in the query language. The pattern is a glob over the whole stored value: `%` matches zero or more characters, `_` matches exactly one, and a backslash makes the next character literal. A wildcard may sit anywhere, the first position included, and Jahia serves every position from the index. The comparison reads the value whole rather than term by term, so `like("off")` does not match `50% off` while `like("%off")` does, and it is case sensitive. On a multi-valued property the node matches when any one of its values matches. Escape `%`, `_` and the backslash, and nothing else: Jackrabbit keeps a backslash that sits in front of a letter or a digit instead of dropping it, against section 6.7.16 of the JCR specification, and it drops a pattern's trailing lone backslash.

`startsWith(text)`, `endsWith(text)` and `contains(text)` take literal text instead of a pattern and do that escaping for you, building `LIKE 'text%'`, `LIKE '%text'` and `LIKE '%text%'`. An empty text builds `LIKE '%%'`, which matches every node that carries the property, so skip the clause when the search box is empty. `contains` builds a `LIKE` pattern and is not the JCR-SQL2 `CONTAINS()` function, which is what `fullText` builds. It is also not the `contains` of Jahia's GraphQL `nodesByCriteria` API, which names the full text search that way: read the translation paragraph above before you carry a query across. None of the three carries a `Slow` suffix, because a leading wildcard is served by the index too. The three are also on `lower()`, `upper()` and `localName()`. A case transform applies to the property and not to the text, so `lower().contains("Privacy")` would build `LOWER(...) LIKE '%Privacy%'`, which could only ever match nothing; the call therefore throws a `QueryError` whose code is `NULL_CONSTRAINT` and names the text to write instead. The check covers `eq`, `ne`, `in`, `like`, `startsWith`, `endsWith` and `contains`, and not the bounds `lt`, `le`, `gt`, `ge` and `between`, where a mixed case bound is a legitimate comparison. A wrong case `ne` fails the other way round: it excludes nothing and returns every node that carries the property. A pattern on a local name walks every local name the index holds, where a pattern on a property walks only that property's own terms, because the index prefixes a property's terms with the property name and a local name carries no such prefix; the walk is wider, but the cost still follows the number of matches. `name()` carries no escaping text method, and its `likeSlow` fails at execution with an `UnsupportedRepositoryOperationException` that `diagnose` reports.

A property reference also gives three folded predicates. `in(values)` folds to `=` comparisons joined with `OR`, and an empty list throws. The fold writes one comparison per value, so keep the list short: Lucene bounds how many clauses one boolean query may hold, and a selection of hundreds of nodes reads better as a path scope or as a node type. `between(low, high)` folds to `>=` and `<=`, both ends included. `notExists()` says that the node does not carry the property: the JCR has no null value, so a property is present on the node or absent from it, and the specification defines `IS NOT NULL` as a test of existence, so a property that holds an empty string exists and `notExists()` does not match it. `in` is also on `lower()`, `upper()`, `localName()` and `name()`.

A property reference gives `lower()` and `upper()`, and the Lucene index serves both for every operator. `upper()` carries the same caveat as `not` below. It fails for a property that the rewriter moves to a `jnt:translation` selector, and that redirect needs an internationalized property in a localized session. `diagnose` reports the risk, and the query is not refused. A lab run on Jahia 8.2.3.2 did not reproduce that failure. In that run, `upper()`, `not` and an ordering on `lower()` returned the expected nodes for an internationalized `jcr:title` in a localized session.

One construct did fail there. `lengthSlow()` over an internationalized property matches nothing. `LENGTH` is evaluated in memory against the node itself, and the translated value lives on a `jnt:translation` child. Use `lengthSlow()` on a property that is not internationalized.

```tsx
// A join runs in memory on both sides, which is why it is named `joinSlow`. The result holds the
// nodes of the left selector, one per matching row, so the same node comes back once per match.
// A statement with the same join returns the same list, so this is Jahia's behaviour and not
// something the builder adds. Deduplicate in JavaScript when you need distinct nodes.
from("jnt:page", "p")
  .joinSlow("jnt:content", "c")
  .on(({ c, p }) => c.isChildOf(p))
  .where(({ c }) => c.prop("j:published").eq(true))
  .select(
    ({ p }) => p.all(),
    ({ c }) => c.prop("jcr:title").as("childTitle"),
  )
  .limit(20);
```

### `JoinType`

This object holds the three join types of the specification, which are `INNER`, `LEFT_OUTER` and `RIGHT_OUTER`. `joinSlow` uses `INNER` when no type is given. Jahia's engine runs a right outer join as a left outer join with the sides swapped, which `diagnose` reports as `partial`.

### `literal`

This function creates a literal and infers its type. A string gives `STRING`, a boolean gives `BOOLEAN`, a bigint gives `LONG`, and a `Date` gives `DATE`. A number gives `LONG` when it is an integer, and `DOUBLE` otherwise. A number beyond `Number.MAX_SAFE_INTEGER` throws `LITERAL_PRECISION`, because it can no longer be written back exactly.

The comparison methods of the builder accept a plain value and call this function for you, so `literal` is mostly useful with the factory.

### `long`

This function creates a `LONG` literal out of a number, a bigint or a string.

### `name`

This function creates a `NAME` literal, which is the type a comparison on `NAME()` or `LOCALNAME()` expects.

### `not`

This function negates a constraint.

```tsx
from("jnt:page")
  .where((p) => not(p.prop("j:published").eq(true)))
  .limit(50);
// SELECT [jnt:page].* FROM [jnt:page] WHERE NOT [jnt:page].[j:published] = true
```

One case fails at execution. Jahia's query rewriter rebuilds a `NOT` with a null child once it has changed the node under it. The rewriter changes that node for a property it moves to a `jnt:translation` selector. That redirect needs an internationalized property in a localized session, so a negation over any other property runs. `diagnose` reports the risk as a `none` finding marked `conditional`, and the builder does not refuse the query.

### `Operator`

This object holds the seven comparison operators of the specification, from `EQUAL_TO` to `LIKE`. The builder methods `eq`, `ne`, `lt`, `le`, `gt`, `ge` and `like` use them, so this object is mostly useful with the factory.

`NOT_EQUAL_TO` excludes multi-valued properties from the result in Jackrabbit, which `diagnose` reports as `partial`.

### `or`

This function combines constraints with `OR`. It takes one constraint or more, and one constraint folds to itself.

### `Order`

This object holds the two ordering directions, which are `ASCENDING` and `DESCENDING`. The builder methods `asc()`, `desc()`, `ascSlow()` and `descSlow()` use them.

### `path`

This function creates a `PATH` literal. A path must be absolute.

### `qom`

This object is the factory layer. It has one pure function per method of `javax.jcr.query.qom.QueryObjectModelFactory`, with the parameter order of Java. The factory is the escape hatch for anything the fluent builder does not express. Five names carry the `Slow` suffix, which are `joinSlow`, `lengthSlow`, `comparisonSlow`, `ascendingSlow` and `descendingSlow`.

```tsx
// `LOWER` on a property is served by the index in a comparison, so this node is fast
qom.comparison(
  qom.lowerCase(qom.propertyValue("p", "jcr:title")),
  Operator.EQUAL_TO,
  literal("home"),
);
```

Each function checks its own arguments and throws a `QueryError`. The checks are the JCR name grammar for node types, selectors and properties, and a looser grammar for column names. A path must be absolute where the specification asks for one.

### `QueryError`

This error carries a `code`, an `at` path into the model, and a `statement` when one exists. The codes are `INVALID_NAME`, `INVALID_PATH`, `INVALID_COLUMN`, `NULL_CONSTRAINT`, `UNDECLARED_SELECTOR`, `DUPLICATE_SELECTOR`, `MISSING_JOIN_CONDITION`, `LITERAL_PRECISION`, `UNBOUND_VARIABLE`, `LIMIT_CONFLICT` and `UNSUPPORTED`.

### `reference`

This function creates a `REFERENCE` literal out of a node identifier.

Jahia's value factory turns a reference value into a weak reference, so a `REFERENCE` literal executes as a `WEAKREFERENCE` one. `diagnose` reports this as `partial`. Write `weakReference()` when that is what you mean.

### `toQOM`

This function turns a model into the host query object, through the object model factory of the session. It is what the execution seams call, and it is exported so that a module can read the statement Jahia formats for a built query.

```tsx
const statement = toQOM(news.build(), session).getStatement();
```

Jahia rewrites the query before the object model exists, so the statement is the one of the rewritten query. In a localized session that rewrite adds a `jcr:language` constraint to every selector that carries none.

The object it returns is the host query, not a builder. Calling `execute()` on it runs the query outside the library, so it carries no limit and no `diagnose()`, whatever the builder it came from said. Use it to read the statement, and `getNodesByJCRQuery` or `useJCRQuery` to run a query.

### `unchecked`

This function accepts a constraint whose selector name is held in a `string` variable, and defers the selector check to `build()`. Use it when the selector name cannot be a literal type, for instance when it comes from a configuration value.

### `uri`

This function creates a `URI` literal.

### `weakReference`

This function creates a `WEAKREFERENCE` literal out of a node identifier.

### Two traps

- A `REFERENCE` literal executes as a weak reference, as the `reference` entry says above. A query that compares a strong reference property therefore behaves as if the property were weak.
- A `DOUBLE` literal against a `LONG` property matches nothing, and nothing reports it. Jackrabbit indexes the two types differently, so `n.prop("count").eq(double(3))` returns an empty result where `n.prop("count").eq(3)` returns rows. Writing `3.0` does not reproduce this, because JavaScript has one number type and `3.0` is the integer `3`. An inferred `DOUBLE` needs a value that is not an integer, as in `eq(3.5)`. Use `long()`, `double()` or `decimal()` when the property type is known.

## URL builder

### `buildEndpointUrl`

This function transforms a path to an endpoint into a full URL.

```tsx
const dashboard = buildEndpointUrl("/jahia/dashboard");
```

### `buildNodeUrl`

This function transforms a JCR node into a full URL to the node.

```tsx
const home = buildNodeUrl(renderContext.getSite().getHome().getNode());
```

### `buildModuleFileUrl`

This function transforms a path to a file in the module into a full URL.

```tsx
const styles = buildModuleFileUrl("dist/styles.css");
```

If the path has a protocol (e.g. `data:` URI), it will be returned as is, pairing nicely with [Vite static asset imports.](https://vite.dev/guide/assets.html#importing-asset-as-url)

### `getImageProps`

This is the underlying function used by the `<JImage />` component to get the image properties.

Can be used directly to forward serialized image properties to an `<img />` element in an Island.

### `getSiteLocales`

This function returns the list of locales available on the current site, taking into account the current rendering mode (EDIT or LIVE).

```tsx
const locales = getSiteLocales();
```

`locales` is an object where the keys are the locale codes and the values are [`java.util.Locale`](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Locale.html) objects.

## Java server API

### `server`

This variable provides access to the Java server API.

```tsx
const bundle = server.osgi.getBundle(bundleKey);
```

## Remarks

This module does not contain actual implementations of the components and hooks. All imports of `@jahia/javascript-modules-engine` must be preserved during the build. This is done automatically if you use [@jahia/vite-plugin](https://www.npmjs.com/package/@jahia/vite-plugin).
