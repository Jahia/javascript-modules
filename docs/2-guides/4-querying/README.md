---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/querying-content
  jcr:title: Querying Content
  j:templateName: documentation
content:
  $subpath: document-area/content
---

A JavaScript module reads content from the JCR with a query. This guide explains how to write a query with the query builder, and how paging works underneath. It also gives the patterns for a page count, for an order-of-magnitude total, and for a stable list while content changes.

## Two ways to write a query

Jahia accepts a JCR SQL2 statement, and the library also accepts a query built with `from()`.

```tsx
import { from, getNodesByJCRQuery, useServerContext } from "@jahia/javascript-modules-library";

const { currentNode } = useServerContext();
const session = currentNode.getSession();

// A statement, with the limit it must not exceed
const a = getNodesByJCRQuery(session, "SELECT * FROM [jnt:news]", 10);

// The same query, built
const b = getNodesByJCRQuery(session, from("jnt:news").limit(10));
```

Prefer the builder. A statement is a string, so you escape by hand every value that you put in it. A mistake gives a syntax error at runtime, or a query that reads more content than you meant. The builder puts each value in a typed literal, so a title that contains a quote is safe. The compiler also checks the query while you write it.

The builder mirrors `javax.jcr.query.qom.QueryObjectModel`, which is the form Jahia hands to its Lucene translation. A statement is parsed into that same form before it runs, so the two paths cost the same and return the same nodes.

The examples below also use `and`, `not`, `date`, `double`, `$`, `qom`, `Operator`, `literal` and `toQOM`, which the same package exports.

## A first query

`from()` takes a node type. Each callback receives the selector of that node type, and the call site gives it the name it wants.

```tsx
const news = from("jnt:news")
  .where((n) => n.isDescendantOf(`/sites/${siteKey}/contents`))
  .orderBy((n) => n.prop("date").desc())
  .limit(10);

const nodes = getNodesByJCRQuery(session, news);
// For a site key of "acme", Jahia formats this query as:
// SELECT [jnt:news].* FROM [jnt:news] WHERE ISDESCENDANTNODE([jnt:news], ['/sites/acme/contents']) ORDER BY [jnt:news].date DESC
```

A selector that carries no alias is named after its node type, which is the name you read in the statement above. Pass an alias as the second argument of `from()` to name it yourself. A query then hands its callbacks a record keyed by alias, as in `.where(({ n }) => ...)`, which is how a join tells its two sides apart. The join example below is written that way.

A query with no explicit column selects one wildcard column per selector, which is why the statement above starts with `SELECT [jnt:news].*`. `select()` names the columns of the statement, as the join example below does. It shapes the statement and nothing else: `getNodesByJCRQuery` and `useJCRQuery` return nodes whatever the columns say, so a named column is not a field of the result. Read the value from the node that comes back.

A builder is immutable, so every call returns a new builder and the base is never changed. One base therefore serves several pages:

```tsx
const page1 = getNodesByJCRQuery(session, news);
const page2 = getNodesByJCRQuery(session, news.offset(10));
```

A query cannot be executed before `limit(n)` was called. `getNodesByJCRQuery` and `useJCRQuery` refuse a builder without a limit at compile time, and they throw a `QueryError` whose code is `UNSUPPORTED` when one reaches them anyway, which is what happens in a module written in JavaScript or behind an `as` cast. The limit is required because a query without one reads every node it matches, and the cost of that read grows with the repository. The escape hatch is `unboundedSlow()`, which returns every matching node and carries its cost in its name.

The rule holds for every query the library executes. It does not reach a query that leaves the library: `toQOM()` hands back the host query object, and `execute()` on that object runs whatever it was built from, with no limit and no `diagnose()`. Use `toQOM()` to read the statement, and the two seams to run a query.

A statement takes the same decision explicitly. `useJCRQuery({ query })` without a `limit` throws, and `useJCRQuery({ query, limit: -1 })` is how you ask for every matching node.

## Values and bind variables

A comparison accepts a plain JavaScript value, and the builder wraps that value in a typed literal. Use an explicit constructor when the property type is not the type that the value infers.

```tsx
from("jnt:event")
  .where((e) => e.prop("startDate").ge(date("2026-09-01T00:00:00.000+02:00")))
  .limit(100);
// SELECT [jnt:event].* FROM [jnt:event] WHERE [jnt:event].startDate >= CAST('2026-09-01T00:00:00.000+02:00' AS DATE)
```

`date()` accepts a `Date` or an ISO 8601 string that carries milliseconds and a zone. A string without a time is refused, so `date("2026-09-01")` throws. The other constructors are `long()`, `double()`, `decimal()`, `name()`, `path()`, `reference()`, `weakReference()` and `uri()`.

A value that the query does not know yet goes in a bind variable, and `bind()` gives that variable a value at execution:

```tsx
const upcoming = from("jnt:event")
  .where((e) => e.prop("startDate").ge($("since")))
  .limit(5);

const events = getNodesByJCRQuery(session, upcoming.bind({ since: new Date() }));
```

The builder replaces each variable with a typed literal before the query reaches Jahia. The query object that Jahia returns does not carry a binding to execution. A variable without a value throws a `QueryError` whose code is `UNBOUND_VARIABLE`.

## Full text search

`fullText()` builds a full text constraint, and `score()` gives the relevance that Lucene computed for a node. Both constructs are served by the index, and an ordering on the score is sorted in Lucene as well.

```tsx
from("jnt:article")
  .where((a) => a.fullText("graal*"))
  .orderBy((a) => a.score().desc())
  .limit(10);
// SELECT [jnt:article].* FROM [jnt:article] WHERE CONTAINS([jnt:article].*, 'graal*') ORDER BY SCORE([jnt:article]) DESC
```

`fullText()` on a selector searches every property of the node. Call it on a property reference to search one property, as in `a.prop("body").fullText("graal*")`. A comparison on the score is the slow case, so its methods are named `gtSlow()`, `eqSlow()` and so on.

`fullText()` is a JCR full text search over the analysed index, and it is not a substring match. It matches whole terms, so `fullText("graal")` matches a node whose text holds the word `graal` and not one that only holds `graaljs`. Use `contains()` when you mean a substring of one property. The method is named `fullText()` and not `contains()` because `contains` is a substring match in Prisma and in Drizzle, and the two are not the same thing.

### The one rule behind every surprise

The two methods read two different stores. `fullText()` reads the Lucene index, which is lower case, accent folded, stemmed and split into terms. `contains()` reads the raw stored value. Every row below follows from that split, and each one was run on a live Jahia 8.2, against a fixture whose stored value holds the text shown.

| Stored value        | Call                   | Result                                           |
| ------------------- | ---------------------- | ------------------------------------------------ |
| `500 seats`         | `fullText("seat")`     | match, because the index holds the stem `seat`   |
| `500 seats`         | `contains("seat")`     | match, because those characters are in the value |
| `500 seats`         | `contains("Seat")`     | no match, a pattern is case sensitive            |
| `500 seats`         | `fullText("seats*")`   | no match, a wildcard term is not stemmed         |
| `Châteaux et Haras` | `fullText("chateaux")` | match, the index folds accents, and the term too |
| `Châteaux et Haras` | `fullText("CHATEAUX")` | match, the index is lower case on both sides     |
| `Châteaux et Haras` | `contains("chateaux")` | no match, a pattern folds nothing                |
| `Châteaux et Haras` | `fullText("*hâteau*")` | no match, a wildcard term is not folded either   |

Reach for `fullText()` to search words a person wrote, and for `contains()` to search the characters of a value. Lowercase a term and strip its accents yourself before you wrap it in a star.

The expression is the JCR full text grammar: terms, quoted phrases, `OR`, a leading `-` to exclude a term, and a trailing `*` for a prefix. The default operator between two terms is `AND`, so `fullText("chateaux zzzznomatch")` matches nothing, and a search box that forwards several words asks for a node that holds every one of them.

Its wildcard is `*`, and `%` and `_` belong to the pattern language instead. A `%` inside a full text expression is not a wildcard, and it is not inert either: it is an ordinary character, and the analyser splits the term at it. `fullText("%chateaux%")` therefore returns what `fullText("chateaux")` returns, while `fullText("ho%me")` asks for `ho` and `me` together and matches nothing where `fullText("home")` matches. A term that carries a `*` skips the analyser, so there the `%` stays inside the term and `fullText("%priv*%")` matches nothing where `fullText("priv*")` matches. A `*` inside a pattern is one more character to match, so `contains("priv*")` looks for a value that really holds `priv` followed by a star.

The expression reaches Jahia as you wrote it, and the JCR parser rejects ordinary keyboard input. `fullText("privacy!")` answers `javax.jcr.RepositoryException: Invalid full text search expression`, and so do `foo(`, an unclosed quotation mark, a bare `OR`, `--` and an empty term. The parser runs inside `execute()`, once the whole query object already exists, and the failure covers the whole constraint, so one rejected expression takes down the clauses beside it. `diagnose()` reads a literal expression and reports four shapes at level `none`, which makes `build({ strict: true })` and `executeQuery` refuse the query before the first call into Jahia: no term left once the operators are removed, an odd number of quotation marks, a parenthesis that does not pair up outside a quoted phrase, and an operator missing the term it needs, which is a trailing `-`, `+`, `!` or `OR`, or a leading `OR`, `&&` or `||`. A `%` is reported at level `partial` and the query still runs.

Each of the four rules is the narrow form, because refusing a legal query costs more than missing an illegal one. They were fitted to 195 expressions run against Jahia 8.2.3.2, and against that run they refuse nothing Jahia accepted. The pairs that decide the shape of each rule are these: `home -` fails while `home-` and `home - ` both run, since `+` and `-` are term characters once a term has begun, and the parser turns a dangling one into ordinary text as soon as whitespace follows it; `home!` fails while `home!page` runs, since `!` is a token wherever it stands; `&&` fails while `&&&` and a single `&` run; a bare `OR` fails while a bare `AND` and a bare `NOT` run; `OR home` fails while `-policy` runs, since only a binary operator needs a term on its left; `"a (b" home` runs, since a parenthesis inside a quoted phrase is text; and `term\`, a backslash with nothing left to escape, runs. A failing shape that none of the four rules covers still answers the `RepositoryException` at execution, which is what you had before this gate existed. The builder never rewrites what you wrote, so sanitise text that a visitor typed before you build the clause: remove every character outside `[\w\s]`, drop a token that starts with `-`, and skip the clause when nothing is left. Skip it on the other side too, because `contains("")` builds `LIKE '%%'`, which matches every node that carries the property instead of none, and nothing reports that.

Scope changes what full text reads. An unscoped `fullText()` reads the node name as well, while `prop("j:nodename").fullText()` does not. A property declared `nofulltext`, such as `j:tagList`, is the opposite case: the flag keeps it out of the aggregated node text and the property keeps its own full text field, so `prop("j:tagList").fullText(term)` finds nodes that the unscoped search does not.

### Coming from the GraphQL `nodesByCriteria` API

The two APIs use the same two words for the opposite operators. Read this table before you translate a query from one to the other.

| What you want                      | GraphQL `nodesByCriteria` | This builder               |
| ---------------------------------- | ------------------------- | -------------------------- |
| Search the analysed index          | `contains: "term"`        | `fullText("term")`         |
| Match the raw stored characters    | `like: "%term%"`          | `contains("term")`         |
| Match the raw characters, any case | `like`, `LOWER_CASE`      | `lower().contains("term")` |

`contains()` here is the substring match, which is what `contains` means in Prisma and in Drizzle. A call that reads `contains("chateaux")` therefore matches characters and not words: it folds no accent, it stems nothing, and it is case sensitive. It returns less than the GraphQL `contains` would return, and it reports no error while it does so. Write `fullText()` when you mean the search that the GraphQL API calls `contains`.

The table has no row for a substring over a whole node, because the JCR has no such operator: `contains()` needs a property, since a comparison takes one operand and a null operand means nothing in JCR QOM. The closest equivalent is a selector `fullText("*term*")` with no property, which reads every property of the node. It matches index tokens and not raw characters, so fold the term and lowercase it yourself before you wrap it in stars, and write it against the stem rather than against the word an editor typed. The `fullText("seats*")` row above is that rule seen from one side: a term carrying a wildcard skips the analyser, so it meets the stem `seat` and never the plural.

## Pattern matching

`like()` is the one pattern match the JCR defines, and there is no regular expression anywhere in the query language. The pattern is a glob over the whole stored value:

- `%` matches zero or more characters.
- `_` matches exactly one character.
- A backslash makes the next character literal, so `\%` matches a percent sign.

A wildcard may sit anywhere, the first position included, and Jahia serves every position from the index. The comparison reads the value whole rather than term by term, so `like("off")` does not match `50% off` while `like("%off")` does, and it is case sensitive. On a multi-valued property the node matches when any one of its values matches.

Three methods take literal text instead of a pattern and escape it for you, so a `%` or a `_` in the text matches itself:

```tsx
from("jnt:news")
  .where((n) =>
    or(
      n.prop("jcr:title").startsWith("50% off"), // LIKE '50\% off%'
      n.prop("jcr:title").endsWith(" off"), // LIKE '% off'
      n.prop("jcr:title").contains("0% o"), // LIKE '%0\% o%'
    ),
  )
  .limit(20);
```

`contains()` builds a `LIKE` pattern. It is not the JCR-SQL2 `CONTAINS()` function: a `CONTAINS` you read in a generated statement comes from `fullText()`.

It is not the `contains` of Jahia's GraphQL `nodesByCriteria` API either. That API uses the two words the other way round: its `contains` is the full text search and its `like` is this raw pattern match. A developer who arrives from it and writes `contains("chateaux")` gets a pattern over the raw characters, which folds no accent, stems nothing and is case sensitive, so the query returns less than expected and reports no error. Write `fullText()` for the operator that API calls `contains`, and read the section "Coming from the GraphQL `nodesByCriteria` API" above before you carry a query across.

None of the three carries a `Slow` suffix, because a leading wildcard is served by the index too: the term scan stays inside that one property, so the cost follows the number of matches and not the size of the repository. The three are also on `lower()` and `upper()`, which is how a case insensitive match is written, and on `localName()`. A pattern on a local name walks every local name the index holds, where a pattern on a property walks only that property's own terms, because the index prefixes a property's terms with the property name and a local name carries no such prefix. The walk is wider, but the cost still follows the number of matches: on a repository of 3324 nodes, a pattern that matched nothing cost the same on both.

A case transform applies to the property and not to your text. `lower().contains("Privacy")` would build `LOWER([jcr:title]) LIKE '%Privacy%'`, which compares a lowercased value against a pattern that still holds a capital, so it could only ever match nothing, and Jahia would report that as an empty result rather than as an error. Both sides are in hand at the call, so the call throws a `QueryError` whose code is `NULL_CONSTRAINT` and which names the text to write instead. Write the text in the case the transform produces: `lower().contains("privacy")`, and `upper().contains("PRIVACY")`. The check covers `eq`, `ne`, `in`, `like`, `startsWith`, `endsWith` and `contains`. `ne` is in that list because its wrong case form fails the other way round: `lower().ne("Home")` builds `LOWER([jcr:title]) <> 'Home'`, which no lowercased value can equal, so it excludes nothing and returns every node that carries the property. The bounds `lt`, `le`, `gt`, `ge` and `between` take any case, because a bound is not a match, and a bind variable is never checked, because it carries no value at the call.

Escape `%`, `_` and the backslash, and nothing else, when you write a pattern by hand. Jackrabbit keeps a backslash that sits in front of a letter or a digit instead of dropping it, which section 6.7.16 of the JCR specification says it should drop, so `like("mee\\ting")` matches nothing rather than `meeting`, and a pattern that ends in a lone backslash loses it. The three methods above never emit that form.

`name()` carries no text method that escapes for you. It does carry `likeSlow()`, for completeness, and that one fails at execution with an `UnsupportedRepositoryOperationException`, which `diagnose()` reports before you run it and `build({ strict: true })` refuses. Use `localName()` for a pattern match on a node name. A pattern on `localName()` is case sensitive and carries no transform, because a JCR function holds one value and not a list. For a node name match that ignores case, use `prop("j:nodename").lower()` on a node type that carries `jmix:nodenameInfo`.

## Everyday predicates

Three more methods build a constraint that would otherwise be written by hand. Each folds into index operators, so `where()` accepts them all.

```tsx
from("jnt:news")
  .where((n) =>
    and(
      n.prop("category").in(["sport", "culture", "science"]),
      n.prop("readingTime").between(2, 10),
      n.prop("expiryDate").notExists(),
    ),
  )
  .limit(20);
```

- `in()` folds to `=` comparisons joined with `OR`. An empty list throws, because it would be a constraint that matches nothing. The fold writes one comparison per value, so keep the list short: Lucene bounds how many clauses one boolean query may hold, and a selection of hundreds of nodes reads better as a path scope or as a node type than as a value list.
- `between()` folds to `>=` and `<=`, and both ends are included.
- `notExists()` says that the node does not carry the property, which is `NOT (n.[expiryDate] IS NOT NULL)`. The JCR has no null value: a property is present on the node or absent from it. The JCR specification defines `IS NOT NULL` over a property as a test of existence, so a property that holds an empty string exists and `notExists()` does not match it. Jahia was measured to behave that way.

`in()` is also available on `lower()`, `upper()` and `localName()`, and on `name()` as well, because `=` is the one operator the index serves for a node name.

## Fast and slow

Jahia's query engine serves most constraints from the Lucene index, and it evaluates the rest in memory, one node load per hit. The in-memory group is slower by orders of magnitude, and its cost grows with the size of the repository. The builder names that group: every function that produces an in-memory construct ends in `Slow`.

```tsx
// Served by the index
from("jnt:page")
  .where((p) => p.prop("jcr:title").like("A%"))
  .limit(20);

// Evaluated in memory, so the name carries `Slow` and only `whereSlow` accepts it
from("jnt:page")
  .whereSlow((p) => p.prop("longText").lengthSlow().gtSlow(3))
  .limit(20);
```

`where()` and `orderBy()` refuse a slow construct, and `whereSlow()` and `orderBySlow()` accept it. A slow construct passed to `where()` or to `orderBy()` is a compile error.

The constructs that run in memory are joins, `LENGTH`, comparisons on `SCORE()`, and comparisons on `NAME()` or `LOCALNAME()` outside their index operators. An ordering on anything other than a property or `SCORE()` is in the same group. `LOWER()` and `UPPER()` on a property are an exception. In a comparison the index serves both functions, and in an ordering it serves neither.

A join is the other construct of that group. `select()` names the columns of the statement, and the example below also shows what the node seam hands back:

```tsx
from("jnt:page", "p")
  .joinSlow("jnt:content", "c")
  .on(({ c, p }) => c.isChildOf(p))
  .where(({ c }) => c.prop("j:published").eq(true))
  .select(
    ({ p }) => p.all(),
    ({ c }) => c.prop("jcr:title").as("childTitle"),
  )
  .limit(20);
// SELECT p.*, c.[jcr:title] AS childTitle FROM [jnt:page] AS p
// INNER JOIN [jnt:content] AS c ON ISCHILDNODE(c, p) WHERE c.[j:published] = true
```

`getNodesByJCRQuery` returns the nodes of the left selector, which are the pages that have a published child in this example. The `childTitle` column shapes the statement and never reaches that array: read the title from the child node instead, or from the rows of the host query object that `toQOM()` gives you. The left node comes back once per matching row, so deduplicate in JavaScript when you need distinct nodes.

The `qom` factory is the escape hatch for a construct that the facade does not express, and a factory node mixes into a builder callback:

```tsx
from("jnt:page")
  .where(() =>
    qom.comparison(
      qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title")),
      Operator.EQUAL_TO,
      literal("home"),
    ),
  )
  .limit(50);
// SELECT [jnt:page].* FROM [jnt:page] WHERE LOWER([jnt:page].[jcr:title]) = 'home'
```

A factory call names its selector with a string, so it needs the name the query gave that selector. Above it is `jnt:page`, the node type, because the query declared no alias. `p.selectorName` on the reference the callback receives holds the same name.

`LENGTH` carries one more limit. Over an internationalized property it matches nothing, because the translated value lives on a `jnt:translation` child node while `LENGTH` reads the node itself. Use `LENGTH` on a property that is not internationalized.

Some facts about a query cannot be read from the query itself. `diagnose()` reports them:

```tsx
for (const { level, at, reason } of news.diagnose()) {
  console.warn(`${level} at ${at}: ${reason}`);
}
```

A level of `none` means the query fails at execution, and the builder refuses such a query before it reaches Jahia. A `none` finding that carries `conditional: true` is the exception. Such a finding fails only under a condition that the model cannot see, so the builder reports the finding and runs the query. The localized sites section below describes that condition.

The four other levels are `partial`, `deep-offset`, `full-scan` and `environment`:

- `partial` means the query runs with different semantics.
- `deep-offset` and `full-scan` mean the query costs more than the query suggests. A join is a `full-scan`, because both sides run unbounded, and so is `unboundedSlow()`.
- `environment` means that a setting or an installation detail decides the cost, and that the model cannot show it. An ordering raises it for the native sort setting, and an offset raises it for the extra JCR providers.

A query that carries nothing worth reporting returns an empty list, so `if (findings.length)` is a signal. Two conditions outside the model are not reported per query, because they apply to nearly every query: the render mode, which can shorten a page, and the session locale, which the localized sites section below covers.

One finding is expected rather than exceptional. Every ordered query carries the `environment` finding at `orderings`, because the ordering is bounded by the limit only while `jahia.jackrabbit.useNativeSort` is true. That setting is true on a default installation, so read this one entry as a note about the installation and not as a problem with the query.

## How paging works

`limit` and `offset` are not applied to the result in JavaScript. Both values travel to Lucene, which receives `offset + limit` as a bound and stops the hit loop there. The cost of a bounded query is the cost of one page, and not the cost of the whole result set.

```tsx
const page = from("jnt:news")
  .orderBy((n) => n.prop("date").desc())
  .limit(20)
  .offset(40);
```

Three details apply to a page:

- The offset counts accepted rows, and it is zero based.
- Past an offset of 32768, Jackrabbit runs the search again with a doubled heap, so a deep offset costs more than a shallow one. `diagnose()` reports this as `deep-offset`.
- A join is the exception. Both sides run unbounded and the merged rows are sliced in memory, which is why the method is named `joinSlow`. The result of a join holds the left selector once per matching row, so deduplicate in JavaScript when you need distinct nodes. A statement with the same join behaves the same way.

A query without `ORDER BY` is ordered by score, and a tie is broken on the internal Lucene document id. That id changes when the repository is reindexed, so page 3 of such a query is not the same page tomorrow. Add an ordering when the pages have to be stable, and see the keyset section below.

## Whether a next page exists

`getNodes().getSize()` is the size of the page. The value is capped at the limit, so it counts the rows of the current page and nothing else.

The cheapest way to know whether more content exists is to ask for one row more than you display:

```tsx
const PAGE = 20;
const rows = getNodesByJCRQuery(session, news.limit(PAGE + 1).offset(offset));
const hasMore = rows.length > PAGE;
const visible = hasMore ? rows.slice(0, PAGE) : rows;
```

The over-fetch costs one extra row, and the answer is exact. Use it for a next page button, for an infinite scroll, and wherever the answer is a boolean.

One case returns fewer nodes than the page holds. Jahia drops a node after the page was counted, for a visitor who lacks read access in preview. Jahia also drops the root of an external provider. The returned array is then shorter than `getSize()`. Read the length of the array for what you display, and read `getSize()` only for the `hasMore` test above.

## An order-of-magnitude total

There is no exact total count with an acceptable cost. `SELECT [rep:count()]` walks every hit and reads a stored document per hit. The cost is linear in the size of the result set, and the count never stops early. Do not put such a count on a page that a visitor can open.

`rep:count(approximate=1)` is bounded whatever the size of the result set. The count stops after about 100 passes and extrapolates, so it gives an order of magnitude and never an exact number. There is no count API in the library, so this one query goes through the session's own query manager.

That path leaves the builder, so the limit rule of this library does not reach it, and neither does `diagnose()`. It is bounded by the `approximate=1` flag and by nothing else. Do not copy the shape of this snippet for a query that returns content: a `setLimit` here would not bound the count, because the count loop never breaks early, and it would make Jackrabbit start with a small heap and run the search again as it doubles. Every query that returns nodes goes through `from()` and one of the two seams.

```tsx
const statement = `SELECT [rep:count(approximate=1)] FROM [jnt:news] AS n
  WHERE ISDESCENDANTNODE(n, ['/sites/acme/contents'])`;
const result = session
  .getWorkspace()
  .getQueryManager()
  .createQuery(statement, "JCR-SQL2")
  .execute();
const row = result.getRows().nextRow();
const estimate = row.getValue("rep:count(approximate=1)").getLong();
const limitReached = row.getValue("approxLimitReached").getBoolean();
```

Four biases apply to the number:

- The estimate is rounded up to 10, 100 or 1000, so it is an order of magnitude.
- The sample is the first 100 passes in sort order, so access rights and translated content skew it.
- An accepted hit consumes two passes, so the estimate is biased low, by up to a factor of two.
- The row of a count query returns the count for every column name but one. The name `approxLimitReached` returns the flag that Jahia carries next to the count, as the last line of the snippet above shows. The flag is true when the sampling limit was reached, so the number is an extrapolation with the biases above. The flag is false when the result set was smaller than the sampling limit, and the number is then the counted one.

Present the number as "about 300 results". When the exact number matters, page through the identifiers as described below and count them, outside a request that a visitor waits on.

## Keyset pagination

An offset has to walk the rows it skips. Carry the last value of the previous page instead, and ask for the rows after that value. This pattern works when the list is long and the order is stable:

```tsx
const PAGE = 20;

const firstPage = from("jnt:news")
  .where((n) => n.isDescendantOf(`/sites/${siteKey}/contents`))
  .orderBy((n) => n.prop("date").desc())
  .limit(PAGE);

const nextPage = from("jnt:news")
  .where((n) =>
    and(n.isDescendantOf(`/sites/${siteKey}/contents`), n.prop("date").lt(date(lastDateOfPage))),
  )
  .orderBy((n) => n.prop("date").desc())
  .limit(PAGE);
```

Every page then costs the same as the first page, because no row is skipped and walked. The ordering property must be unique. When two nodes share a value on a page boundary, one of the two nodes is skipped or repeated. Add a second ordering on the identifier when the value can repeat:

```tsx
.orderBy(
  (n) => n.prop("date").desc(),
  (n) => n.prop("jcr:uuid").asc(),
)
```

## A stable list while content changes

A loop can read a page, change the nodes of that page, and then read the next page. Such a loop misses nodes or reads them twice, because the change moves rows between pages. Take a snapshot of the identifiers first, then work through the snapshot:

```tsx
const identifiers: string[] = [];
const PAGE = 100;

for (let offset = 0; ; offset += PAGE) {
  const query = from("jnt:content")
    .where((n) => and(n.isDescendantOf(scope), not(n.prop("jcr:language").exists())))
    .orderBy((n) => n.prop("jcr:uuid").asc())
    .limit(PAGE)
    .offset(offset);

  const page = getNodesByJCRQuery(session, query);
  if (page.length === 0) break;
  for (const node of page) identifiers.push(node.getIdentifier());
}

// The snapshot is complete, so the nodes can now be changed
for (const identifier of identifiers) {
  const node = session.getNodeByIdentifier(identifier);
  // ...
}
```

Two details make this loop correct:

- `ORDER BY n.[jcr:uuid]` is a unique and stable order, so a page boundary never moves.
- `not(n.prop("jcr:language").exists())` keeps the translation nodes out of the scan. Without that constraint, a localized site returns one row per language per node, the pages contain duplicates, and the scan reads twice as many documents.

## Localized sites

An internationalized property is stored on a `jnt:translation` child node. In a localized session, Jahia rewrites the query so that every selector without a `jcr:language` constraint carries one. The search then matches the translation nodes as well, and Jahia maps the hits of a translation node back to its parent node. Four consequences reach a module author:

- The hit stream doubles on a site with translated content, even for a query that reads no internationalized property. Constrain `jcr:language` as in the loop above when the query does not need the translations.
- Rows can be reordered inside a page when the translation was modified after its parent, for an ordering on a property such as `jcr:lastModified`.
- Two constructs fail once the rewrite has redirected a property. The two constructs are `NOT` around a constraint on that property, and `UPPER` around that property. The rewriter rebuilds such a node with a null child. Both constructs run for a property that the rewrite leaves alone, which is every property that is not internationalized, `jcr:language` included. `diagnose()` reports the risk at level `none` with `conditional: true`, and the builder executes the query.
  - A lab run on Jahia 8.2.3.2 did not reproduce either failure. In that run, `NOT`, `UPPER` and an ordering on `LOWER` returned the expected nodes for an internationalized `jcr:title` in a localized session.
- `jcr:language = $var` fails in every session, because the query rewriter throws a `ClassCastException` on the bind variable. That finding is a `none` without `conditional`, so the execution seams throw `UNSUPPORTED` before the query reaches Jahia.

## Two traps

- A `REFERENCE` literal executes as a weak reference, because Jahia's value factory converts it. A query that compares a strong reference property therefore behaves as if the property were weak. `diagnose()` reports this as `partial`.
- A `DOUBLE` literal against a `LONG` property matches nothing, and nothing reports it. Jackrabbit indexes the two types differently, so `n.prop("count").eq(double(3))` returns an empty result where `n.prop("count").eq(3)` returns rows. Writing `3.0` does not reproduce this, because JavaScript has one number type and `3.0` is the integer `3`: the builder infers `LONG` for both. An inferred `DOUBLE` needs a value that is not an integer, as in `n.prop("count").eq(3.5)`. Use `long()`, `double()` or `decimal()` when you know the type of the property.

## Where to look next

The `Query builder` section of the [`@jahia/javascript-modules-library` README](https://www.npmjs.com/package/@jahia/javascript-modules-library) lists every export with its signature. The list includes the `qom` factory, which is the escape hatch for anything the facade does not express.
