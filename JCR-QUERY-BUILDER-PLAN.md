# JCR query builder for JavaScript modules: implementation plan

- Status: draft for review by Romain Gauthier. It was written 2026-09-19 and revised the same day after the pagination deep dive, the total-count verification and the branch decision. This document is a plan, and nobody implements the builder yet.
- Baseline: a git worktree of `origin/main` at `e3db20f`, branch `feat/jcr-query-builder`, at `/Users/romaingauthier/dev/javascript-modules-jcr-query-builder`. It holds `javascript-modules` at `1.3.0-SNAPSHOT`, see `JSM/pom.xml:28`, with Jahia parent `8.2.1.0`, see `JSM/pom.xml:24`. Core facts were verified on `jahia-private@main` at sha `a461e5166e` and on `origin/JAHIA-8-2-1-X-BRANCH` at sha `96a79a75af`. Jahia 8.2 runs the Jackrabbit fork `2.22.0-jahia1`, see `jahia-parent/pom.xml:72`.
- Inputs: research reports A1 to A4, reviews R1 to R3, design D4, and six probes against the fork jars and GraalJS 23.0.5. The deep dive `scratchpad/jcr-query-builder/limit-offset-deep-dive.md` and a verification of total counts and fork sources complete the inputs. The probes are `Bench.java`, `Cols.java`, `Probe.java`, `Cols2.java`, `Probe2.java` and `Probe3.java` in the `bench/` folder of the Cortex scratchpad.
- Path prefixes: `CORE` is `sources/jahia-private/core/src/main/java`, `JSM` is the worktree, `LIB` is `JSM/javascript-modules-library`, and `EJ` is `JSM/javascript-modules-engine-java`. `INT` is `sources/javascript-modules` on `local/integration`, the branch that holds the content-patches framework and the server-runtime-boundary lint. `qom/` is the JCR 2.0 API folder `javax/jcr/query/qom/` from `jcr-2.0-sources.jar`. `FORK` is `jackrabbit-core/src/main/java/org/apache/jackrabbit/core/query/lucene/` of https://github.com/Jahia/jackrabbit at tag `2.22.0-jahia1`. Every `LIB`, `EJ`, `JSM` and docs pointer was re-read on the worktree on 2026-09-19. Pointers into `CORE`, `graphql-core` and `FORK` do not depend on the branch.

## 1. Goal

This plan defines a TypeScript query builder for Jahia JavaScript modules. The builder is modeled on `javax.jcr.query.qom.QueryObjectModel`, the JCR 2.0 Query Object Model. Module developers get typed query construction instead of hand-built SQL2 strings. Today the library exports `getNodesByJCRQuery` and `useJCRQuery`, and both take a SQL2 string. On `local/integration`, the content-patch code concatenates SQL2 by hand at `INT/javascript-modules-library/src/framework/contentPatches/jcr.ts:21-34`.

The guiding principle is fewer features and good performance by default. A developer who uses the builder gets a query whose limit and offset reach Lucene, unless a name in the call chain says otherwise. Every public function that produces a construct Jackrabbit runs in memory carries the suffix `Slow`, in the factory and in the facade. A query cannot execute before `.limit(n)` is called, and the explicit escape hatch is `.unboundedSlow()`.

Romain made nine decisions, and section 13 quotes them verbatim. The builder lives in `@jahia/javascript-modules-library` as a pure TypeScript `src/query/` sub-module, next to `getNodesByJCRQuery` and `useJCRQuery`, which accept a built query. The builder binds to the QOM factory of the session, because QOM is the lowest level Jackrabbit offers, see section 3. The API has two layers: functions that mirror `QueryObjectModelFactory`, and a chainable facade such as `from("jnt:page", "p").where(...).orderBy(...).limit(10)`. Coverage is the full JCR 2.0 QOM, joins included. Constructs that Jahia's Jackrabbit does not execute are documented and, where possible, typed as unsupported.

## 2. Verified ground truth

Every claim in sections 2.1 to 2.5 carries a `file:line` pointer, a probe name or a `javap` note. Items that no source or probe confirms are in section 2.6.

### 2.1 Jahia query pipeline

- The public QOM entry point is `QueryManagerWrapper.getQOMFactory()` at `CORE/org/jahia/services/content/QueryManagerWrapper.java:97`, and the only implementation is `QueryManagerImpl` at `CORE/org/jahia/services/query/QueryManagerImpl.java:75`. It wraps the Jackrabbit factory of the default provider in a `java.lang.reflect.Proxy` at `:185-196`, and every factory method goes through `Method.invoke` at `:99-100`. The string entry point `createQuery(statement, language)` builds a `QueryWrapper` directly at `:168-175`.
- The proxy intercepts `createQuery` at `:91-97`. It runs `QueryService.modifyAndOptimizeQuery` on the four parts and returns a second proxy over the `QueryObjectModel`. That second proxy records `setLimit` and `setOffset` at `:139-142` and builds a `QueryWrapper` on `execute()` at `:134-138`.
- `QueryWrapper.init()` loops over all providers at `CORE/org/jahia/services/query/QueryWrapper.java:130-146`. The default provider reuses the QOM at `:173-174`, and every other provider parses the statement string at `:183`. The QOM constructor stores `statement = qom.getStatement()` at `:117`, so that string is the `QOMFormatter` output. For every SQL2 query, `QueryWrapper.getQuery` runs `modifyAndOptimizeQuery` and then calls `factory.createQuery(...)` again at `:219-240`. The QOM path is therefore rewritten twice, and the executed implementation is always rebuilt at `:240`.
- The rewrite casts every node to a Jackrabbit `spi-commons` implementation class at `CORE/org/jahia/services/query/QueryServiceImpl.java:172-184`. A QOM must come from the session's factory. Jahia already executes factory-built QOMs in production through `QOMBuilder` at `CORE/org/jahia/services/query/QOMBuilder.java:64-198` and through the JSP query taglib.
- Bind variables on the QOM proxy go to the original implementation at `QueryManagerImpl.java:144`. `QueryWrapper` starts with an empty variable map at `QueryWrapper.java:119` and rebuilds the implementation at `:240`. The string path binds the variables at execution at `:381-383`. `OperandEvaluator` throws `RepositoryException("Unknown bind variable")` for a missing name, per `javap` on `jackrabbit-jcr-commons`.
- Jackrabbit parses SQL2 into the same QOM tree. `QueryManagerImpl$QueryFactoryImpl` in `jackrabbit-core-2.22.0-jahia1.jar` calls `QOMQueryFactory`, which resolves `SQL2QOMBuilder`, which calls `org.apache.jackrabbit.commons.query.sql2.Parser`. `SQL2QOMBuilder` and `Parser` both live in `jackrabbit-jcr-commons-2.22.0-jahia1.jar`, per `javap` and `unzip -l` on the fork jars. `QueryObjectModelImpl.init(tree)` formats every QOM to SQL2 with `QOMFormatter` at creation.
- The fork creates `JahiaQueryObjectModelImpl` for both paths at `CORE/org/apache/jackrabbit/core/query/lucene/JahiaSearchIndex.java:698-705`. Node type existence is checked at execution only, at `CORE/org/apache/jackrabbit/core/query/lucene/JahiaLuceneQueryFactoryImpl.java:220`. Execution time is logged in milliseconds at `CORE/org/apache/jackrabbit/core/query/JahiaQueryObjectModelImpl.java:124-126`.
- The i18n rewrite adds `sel.[jcr:language] = '<locale>' OR NOT sel.[jcr:language] IS NOT NULL` for each property-based node on a selector without a language constraint. See `CORE/org/jahia/services/query/QueryModifierAndOptimizerVisitor.java:161-215`, `:655-661` and `:684-708`. A wildcard column counts as a property-based node at `:674-681`, and translation hits are mapped back to the parent node and deduplicated at `JahiaLuceneQueryFactoryImpl.java:260`.
- `getNodes()` on a multi-selector result returns, per row, the node of the first selector at `CORE/org/jahia/services/query/QueryResultAdapter.java:238-256`. `getRows()` exists on the wrapper at `CORE/org/jahia/services/query/QueryResultWrapperImpl.java:112-125`.
- `JahiaQueryEngine` reads the native sort flag once, at class init, at `CORE/org/apache/jackrabbit/core/query/lucene/join/JahiaQueryEngine.java:88`, with a code default of `false`. `CORE/org/jahia/settings/SettingsBean.java:617` sets that system property to `true` by default before the class loads, so a default installation sorts in Lucene. With native sort, `:124-136` sends a Lucene `Sort` to `JahiaLuceneQueryFactoryImpl`, and `:149-152` skips the in-memory sort. An ordering on a property or on `SCORE()` is therefore bounded by `offset + limit`, see section 2.4. The row collection is at `JahiaLuceneQueryFactoryImpl.java:226-227` and `:306-318`.
- In `FORK/LuceneQueryFactory.java`, a comparison becomes an in-memory `RowPredicate` at `:382-403` in three cases. The first case is an operand of `Length` or `FullTextSearchScore`. The second is `NAME()` or `LOCALNAME()` with an operator other than `=` and `LIKE`, and the third is the same operands under `LOWER` or `UPPER`. The predicate loads the node of every scanned hit. Every other comparison becomes a Lucene query at `:609-636`.
- `LOWER` and `UPPER` over a property stay on the index for every operator. The queries are `WildcardQuery` for `LIKE` at `:703-704` and `CaseTermQuery` for `=` at `:708-713`. A range operator gives `RangeQuery` with the transform at `:718-724`, and `<>` gives a `MUST_NOT` clause at `:726-735`. Nested transforms collapse to the outer one at `:584-605`. `NAME()` with `LIKE` and no transform throws `UnsupportedRepositoryOperationException` at `:642-644`, and `LOCALNAME()` runs on the index for `=` and `LIKE` at `:677-685`.
- `session.getValueFactory()` returns the singleton `JCRValueFactoryImpl` at `CORE/org/jahia/services/content/JCRSessionWrapper.java:626-628`. That factory skips name and path checks at `CORE/org/jahia/services/content/JCRValueFactoryImpl.java:72-80` and remaps `REFERENCE` to `WEAKREFERENCE` at `:96-99`. Facets are column names that start with `rep:facet(`, see `JahiaQueryObjectModelImpl.java:88`. The `&` placeholder hack applies to string-parsed statements at `QueryWrapper.java:176-182`, and `rep:count(` is recognised at `QueryWrapper.java:413-419`.

### 2.2 javascript-modules runtime and library

- The engine builds the polyglot context with `allowHostClassLookup(s -> true)`, `HostAccess.ALL` and `PolyglotAccess.ALL` at `EJ/src/main/java/org/jahia/modules/javascript/modules/engine/jsengine/GraalVMEngine.java:201-206`. Contexts are pooled at `:194`, and the only engine global is `server` at `:210`. `INT/docs/3-reference/3-server-runtime-boundary/README.md:69-70` states that polyglot globals such as `Java` are present but unsupported, and `main` has no such document.
- Java types reach TypeScript as `import type` from ambient modules. `LIB/tsconfig.json:23-25` maps `*` to `target/types/*`, and `LIB/post-build.js:15-23` copies those files into `dist/`. The worktree has no `target/` before its first Maven build. On the `INT` build output, `QueryManagerWrapper` has `createQuery` alone at `target/types/org.jahia.services.content.d.ts:2180-2196`, and `QueryResultWrapper` has `getApproxCount` and `getNodes` at `org.jahia.services.query.d.ts:9-22`. No generated file mentions `QueryObjectModel`, `ValueFactory` or `getRows`. `getRows()` is callable from JavaScript today under `HostAccess.ALL`, and only the `.d.ts` lacks it.
- The java-ts-bind config is `EJ/.java-ts-bind/package.json`, 486 lines. `include` at `:34-113` is prefix-matched and lists `javax.jcr.Value` at `:68`, `QueryManagerWrapper` at `:93` and `QueryResultWrapper` at `:96`. `fieldWhitelist` at `:114-116` holds one empty string. `methodWhitelist` at `:117` names `QueryManagerWrapper.createQuery` at `:300` and `QueryResultWrapper.getApproxCount` and `getNodes` at `:332-333`. `blacklist` at `:356` names `javax.jcr.query.Query`, `javax.jcr.query.QueryManager`, `javax.jcr.query.qom.QueryObjectModel` and `javax.jcr.query.qom.QueryObjectModelFactory` at `:429-432`. A blacklisted type and every member that uses it are omitted, and the blacklist applies after `include`, per `javap` on `BindGenApp#isIncluded`.
- The regen runs in the engine-java Maven build. `EJ/pom.xml:339-356` runs java-ts-bind in the `prepare-package` phase, `:358-364` runs `apply-patch.sh`, and `:390-391` packs the `typescript-types` tgz. The first run downloads the `jdk17u` source zip at `:229-244`. `LIB/pom.xml:85-97` unpacks that tgz into `target/types`. `apply-patch.sh:63-69` runs every `sed` without a check that the search matched. An earlier read on `INT` found that the entries at `:11` and `:24` matched nothing.
- The library is server-only as a whole. `JSM/javascript-modules-engine/shared-libs.mjs:38-39` lists it under `serverLibs`, `JSM/vite-plugin/src/index.ts:169-175` throws on an import of the library in the client bundle, and `:211` externalises it on the SSR side. `JSM/javascript-modules-engine/rolldown.config.mjs:91-108` resolves the library to `internal-dist/index.js`, and `LIB/post-build.js:25-33` writes a `dist/index.js` stub that logs an error. No file under `LIB/src` carries a `.server.ts` suffix, and `LIB/src/globals.d.ts:16` declares the `server` global. `JSM/eslint.config.js` has 58 lines with one library block at `:53-57`, and no rule restricts `server` or Java imports. The `.server.*` lint block exists on `INT/eslint.config.js:142-171` only. `JSM/docs/3-reference/2-naming-conventions/README.md:5-6` lists the `.client.tsx` and `.server.tsx` conventions for module code.
- The library has no test runner, and `JSM/javascript-create-module/package.json:27` runs `node --test`. `tsc` excludes `**/*.spec.ts` at `LIB/tsconfig.json:29`, and the local Node is `v20.17.0`.
- Call sites: `getNodesByJCRQuery(session, query, limit?, offset = 0)` at `LIB/src/utils/jcr/getNodesByJCRQuery.ts:14-19`, with a falsy-limit guard at `:22-27` and `createQuery(query, "JCR-SQL2")` at `:29`. It calls `setLimit` when `limit > 0` and `setOffset` when `offset > 0` at `:30-36`. `useJCRQuery({ query })` at `LIB/src/hooks/useJCRQuery.ts:10-18` passes `-1` at `:17`, so it is unbounded by construction. The test view interpolates a path at `JSM/jahia-test-module/src/react/server/views/testJCRQuery/TestJCRQuery.tsx:36-39`. Content patches exist on `INT` only: `jcr.ts:21-34` concatenates SQL2, `:76-92` reads identifiers in pages of 1000 before any mutation, and `:62-63` post-filters `includeSubtypes`. Every call site needs a single selector, a path scope, string literals, a limit and an offset. None needs ordering, joins, columns, full text or bind variables.
- GraalJS 23.0.5, see `JSM/pom.xml:65`, converts a JS array to `Ordering[]` and `Column[]` through the reflect proxy and converts `undefined` to `null`. It accepts `createValue('42', 3)` and rejects `createValue(42, 3)` and `createValue(new Date())`. Source: probes `Probe.java` and `Probe3.java`.

### 2.3 QOM and Jackrabbit support matrix

Rows with a `FORK` pointer were read in the fork source at tag `2.22.0-jahia1` on 2026-09-19. Rows marked "trunk" were read in Jackrabbit trunk source, the 2.x line, and `javap` on `jackrabbit-core-2.22.0-jahia1.jar` confirms their classes. The matrix applies to the default configuration, with native sort on and ACL ids in the index.

| Construct | Support in Jahia 8.2 | Evidence |
|---|---|---|
| Selector, `=` `<` `<=` `>` `>=` `LIKE` on a property, `PropertyExistence`, `SameNode`, `ChildNode`, `DescendantNode` | Runs on the index. | `FORK/LuceneQueryFactory.java:609-627`, `:699-724`; `JahiaLuceneQueryFactoryImpl.java:93-95` |
| `<>` on a property | Runs on the index, and excludes multi-valued properties. | `FORK/LuceneQueryFactory.java:726-735` |
| `LOWER` or `UPPER` on a property, any operator | Runs on the index. Nested transforms collapse to the outer one. | `FORK/LuceneQueryFactory.java:584-605`, `:703-713`, `:718-724`, `:729-732` |
| `NAME()` with `=`. `LOCALNAME()` with `=` or `LIKE`. No transform. | Runs on the index. | `FORK/LuceneQueryFactory.java:629-631`, `:640-644`, `:677-685` |
| `NAME()` with `LIKE`, no transform | Fails with `UnsupportedRepositoryOperationException`. | `FORK/LuceneQueryFactory.java:642-644` |
| `LENGTH()` or `SCORE()` in a comparison, any operator. `NAME()` or `LOCALNAME()` with another operator, or under `LOWER` or `UPPER`. | Runs in memory as a `RowPredicate`, with one node load per scanned hit. | `FORK/LuceneQueryFactory.java:382-403` |
| `CONTAINS` on `sel.*` or on a property | Runs on the index. | trunk `LuceneQueryFactory` |
| Any join | Runs in memory. Both sides run unbounded, and `RIGHT OUTER` becomes `LEFT OUTER`. | `JahiaQueryEngine.java:213-233`, `:281-319`; `FORK/join/QueryEngine.java:295-296`, `:346-347`, `:371-372`, `:612-635` |
| `ORDER BY` on a property or on `SCORE()` | Sorted in Lucene, bounded by `offset + limit`. `:186-192` corrects the score flag to JCR semantics. | `JahiaQueryEngine.java:88`, `:124-136`, `:186-195`; `SettingsBean.java:617`; `FORK/SharedFieldComparatorSource.java:92-99`, `:147-163` |
| `ORDER BY` on any other operand | The heap stays bounded, but the comparator loads a node and evaluates the operand for every collected doc. | `JahiaQueryEngine.java:196-197`; `FORK/sort/DynamicOperandFieldComparator.java:41-52` |
| Bind variable through the QOM proxy | Fails at execution. | `QueryManagerImpl.java:144`; `QueryWrapper.java:119`, `:240` |
| `REFERENCE` literal through `JCRValueFactoryImpl` | Executes as `WEAKREFERENCE`. | `JCRValueFactoryImpl.java:96-99` |
| `NOT` or `UPPER` around a property redirected to a `jnt:translation` join selector | Fails; the visitor rebuilds with `null`. | `QueryModifierAndOptimizerVisitor.java:380-386`, `:488-493` |
| `jcr:language = $var` | Fails with a `ClassCastException`, wrapped in a `RepositoryException`. | `QueryModifierAndOptimizerVisitor.java:261-273`; `QueryServiceImpl.java:187-188` |
| `column(sel, null, "alias")` or `sameNodeJoinCondition(s1, s2, null)` | Rejected at build by the factory. | probes `Cols2.java`, `Probe3.java` |

Formatter facts for the fork, all from `Probe3.java` unless noted. They describe `getStatement()`, the only text form of a built query:

- Paths are always written as `['/sites/x']`, also `['/']` and `['.']`. Trunk source writes `[/path]` when the path has no space, so the trunk rule in report A3 was wrong for the fork. The Parser writes `"."` as the path of `ISSAMENODE(p, c)`.
- `And` writes parentheses around an `Or` or `Not` child, and `Or` and `Not` write none. The Parser reads `NOT a AND b` as `NOT (a AND b)`, so the parentheses around a `Not` child of `And` are required.
- `AS` is omitted when the selector name equals the node type, and `ASC` is never written. An empty column list writes `*`, and the Parser gives `SELECT *` over a join one wildcard column per selector, per `Cols2.java`.
- A string literal doubles `'`, a boolean literal is bare, and every other type is `CAST('...' AS TYPE)`. The Parser types a bare `4.5` as `DECIMAL` and `42` as `LONG`. A name is bare when it matches `[A-Za-z][A-Za-z0-9_]*`, and bracketed otherwise, and the factory rejects `]` inside a name. Operator, join type and order constants are the dotted strings in `qom/QueryObjectModelConstants.java:15-70`.

### 2.4 Pagination push-down

Push-down means that Lucene receives `offset + limit` as a bound and that the hit loop stops early. The chain is one code path. `QueryWrapper.execute()` calls `setLimit` and `setOffset` on each provider query at `QueryWrapper.java:375-384`, and the QOM proxy replays the recorded values at `QueryManagerImpl.java:124-142`. `JahiaQueryObjectModelImpl.execute` passes both fields to the engine at `JahiaQueryObjectModelImpl.java:107-117`.

`JahiaLuceneQueryFactoryImpl.execute` maps `limit < 0` to `Integer.MAX_VALUE` at `:204-205` and sends `offset + limit` as the fetch hint at `:237`. The heap is `clamp(offset + limit, 32, 32768)` at `FORK/SortedLuceneQueryHits.java:110-112`, and it refills by doubling at `:130-133` and `:154-166`. The loop counts accepted rows only and breaks at `limit` at `JahiaLuceneQueryFactoryImpl.java:310-318`. Line numbers without a file in the two tables below are in `JahiaLuceneQueryFactoryImpl.java`.

| Construct or layer | Verdict | Evidence |
|---|---|---|
| Single selector, no `ORDER BY` | Bounded. The heap sorts on `FIELD_SCORE`, and the loop breaks at `limit`. | `JahiaQueryEngine.java:166-168`, `FORK/SortedLuceneQueryHits.java:110-112`, `JahiaLuceneQueryFactoryImpl.java:316-318` |
| `ORDER BY` on a property | Bounded. `SharedFieldComparatorSource` compares through a per-segment value index in O(1). | `JahiaQueryEngine.java:193-195`, `FORK/SharedFieldComparatorSource.java:92-99`, `:147-163` |
| `ORDER BY SCORE()`, `CONTAINS` | Bounded, both are native Lucene constructs. | `JahiaQueryEngine.java:191-192` |
| `ORDER BY` on a function operand | The heap is bounded, but the comparator loads a node for every collected doc. | `JahiaQueryEngine.java:196-197`, `FORK/sort/DynamicOperandFieldComparator.java:41-52` |
| `WHERE` on `LENGTH`, `SCORE`, or `NAME` and `LOCALNAME` outside `=` and `LIKE` | The heap is bounded on the other clauses, and the predicate loads one node per scanned hit. | `FORK/LuceneQueryFactory.java:382-403` |
| Join | Not bounded. Both sides run with offset 0 and limit -1, and `sort()` slices the merged rows in memory. | `JahiaQueryEngine.java:281-319`, `FORK/join/QueryEngine.java:295-296`, `:346-347`, `:371-372`, `:612-635` |
| `rep:facet` column, `rep:count` column | Not bounded, except `rep:count` with `approximate=1`, see section 2.5. A facet-only select never breaks, and it sets a bit for every readable hit. | `:321-333`, `:389-394`, `:243-256`, `:397-404` |
| `useNativeSort=false` with `ORDER BY` | Not bounded. Every accepted row is listed, sorted with `RowComparator`, and then sliced. | `:306-307`, `FORK/join/QueryEngine.java:612-635` |
| Several providers | Bounded per provider. Provider 1 runs once more without limit when it returns 0 rows under an offset. | `QueryWrapper.java:386-407`, `:401-402` |
| Translated content, localised session | Bounded, but the hint covers half of the docs, so one refill is the usual case. | `QueryModifierAndOptimizerVisitor.java:657-712`, `FORK/SortedLuceneQueryHits.java:130-133` |
| GraphQL `nodesByQuery` | Not bounded. The JCR query runs without limit, Java slices the stream, and `totalCount` reads the whole remaining iterator. | `GqlJcrQuery.java:243-246`, `PaginationHelper.java:116-155`, `:375-384` |
| `getNodesByJCRQuery` with `-1`, `useJCRQuery` with a string | Not bounded. Every readable hit is ACL-checked, and every node is wrapped. | `getNodesByJCRQuery.ts:30-32`, `useJCRQuery.ts:17` |

| Item | Guarantee |
|---|---|
| `offset` | The offset is 0-based and counts accepted rows only, at `:308-312`. `QueryWrapper` ignores a negative offset at `QueryWrapper.java:378`, and a raw Jackrabbit query throws on one. |
| `limit` | The limit is the maximum number of rows returned, and it must fit in an `int`. `-1` means unbounded and becomes `Integer.MAX_VALUE` at `:205`. |
| `getNodes().getSize()` | This is the page size, summed over providers, capped at `limit`, and counted before `NodeIteratorWrapper` drops a node. It is never a total. Evidence: `JahiaSimpleQueryResult.java:98-100`, `NodeIteratorWrapper.java:121-123`, `MultipleIterator.java:73-83`. |
| `getTotalSize()` | The method does not exist on the SQL2 and QOM path, because `SimpleQueryResult` implements `QueryResult` only, at `FORK/join/SimpleQueryResult.java:30`. |
| `getApproxCount()` | The value is `0` on the native sort path, at `JahiaQueryEngine.java:148`, `:157-159` and `JahiaSimpleQueryResult.java:63-65`. |
| ACL effect on the page | A rejection inside the Lucene loop does not shorten the page, at `:260`, `:265-273`, `:310-318`. A drop at wrap time does, at `NodeIteratorWrapper.java:95-99`. |
| Order without `ORDER BY` | The order is score descending, and a tie breaks on the Lucene doc id. Page N of a constant-score query can therefore change after a reindex. |

Of the six fork files checked against upstream 2.22.0, five are byte-identical. The one change is in `FORK/join/QueryEngine.java`: six fields and four helpers became `protected` so that `JahiaQueryEngine` can subclass, with no behavioural change. An earlier draft cited `SortedLuceneQueryHits.java:316-318` for the limit break. That line is `JahiaLuceneQueryFactoryImpl.java:316-318`.

### 2.5 Total count

There is no exact total count with acceptable cost on Jahia's JCR query path. `SELECT [rep:count()]` is O(N) in the number of Lucene hits:

- The loop never breaks early. The break at `JahiaLuceneQueryFactoryImpl.java:316-318` is in the `row != null` branch, which the count path never reaches.
- The loop reads one stored document per hit, and two per accepted hit, because the `continue` at `:302-304` re-enters the loop before `hits.nextScoreNode()` at `:381`.
- A count query passes limit `-1`, so the heap is clamped to 32768. The search re-runs with a doubled heap as the loop walks past each window, at `FORK/SortedLuceneQueryHits.java:130-133` and `:154-166`.
- A system session makes the cached ACL check O(1) per distinct ACL id, at `CORE/org/apache/jackrabbit/core/security/JahiaAccessManager.java:313-316`, and it removes nothing else. `skipChecks=1` removes the ACL and published checks at `:261-262` and still reads one document per hit for the dedup at `:463`.

No other exact path exists. `SimpleQueryResult` has no `getTotalSize`, and `getApproxCount()` is `0` on the native sort path. `QueryWrapper.getResultCount` returns a page size at `QueryWrapper.java:422-425`, and GraphQL `totalCount` drains the iterator at `PaginationHelper.java:230`, `:263` and `:375`. jContent runs an exact `rep:count()` per node type at `GqlEditorForms.java:244`, the export at `ExportContext.java:216` and augmented-search use `skipChecks=1`, and nothing on disk uses `approximate=1`.

`rep:count(approximate=1)` is bounded regardless of N. `CORE/org/apache/jackrabbit/core/query/lucene/CountHandler.java:144-168` parses the flags, and the default `approxCountLimit` is 100 at `SettingsBean.java:457`. The loop stops after about 101 passes and about 200 document reads at `:247-258`. It then extrapolates at `:398-401` as `totalHits * accepted / 100`, rounded up to 10, 100 or 1000. `totalHits` is the pre-ACL, pre-dedup Lucene total from `FORK/SortedLuceneQueryHits.java:158`, returned by `getSize()` at `:119-121`.

The sample is the first 100 passes in sort order, so ACL skew and translation docs bias it. Because an accepted hit consumes two passes, the estimate is biased low by up to 2x. That bias is static reasoning, and section 14 lists the lab check. `wasApproxLimitReached` travels on the `CountRow` at `CountHandler.java:175-177` and is aggregated at `QueryResultWrapperImpl.java:128-149`. The `int` arithmetic at `:399` overflows past about 21 million hits.

### 2.6 Unverified items

- Live: a factory QOM with one wildcard column per selector and a parsed `SELECT *` return the same nodes on a multilingual site. `getNodes()` on a join through the multi-provider fan-out returns the left selector's nodes. The two visitor null-rebuild defects and the `jcr:language = $var` cast reproduce on a lab instance.
- Build: the effect of the blacklist removal on the other emitted `.d.ts` files. `flattenType` may need the parent `javax.jcr.query.Query` to be included to copy its members. Whether `addMissingOverloads` duplicates overloads in `ValueFactory` or `Node`, and the wall-clock time of a regen on a developer machine.
- Environment and recollection: formatter parity on Jackrabbit `2.20.12-jahia1`, the version on the 8.2.1 branch. Whether Jahia's engine runs GraalJS in interpreter mode like the probe. Two items are recollection: `RowPredicate` evaluation of `LIKE` through `ValueComparator`, and `JackrabbitQuery.execute` returning non-null hits only with an empty sort. Lucene 3.6 `new Sort()` defaulting to `FIELD_SCORE` is recollection too, and the body of `PaginationHelper.getTotalCount` at `:375` was not re-read.
- Whether the java-ts-bind blacklist entries record a product decision. They date from the initial generation commit `f8604a2` with about 60 other `javax.jcr` types.

## 3. Sink doublecheck

Romain's decision 2 names QOM as the probable lowest level and asks for a check of the proxy and performance argument. This section gives the evidence first and the outcome last.

For Jackrabbit, QOM is the executed unit. `createQuery(String, JCR_SQL2)` runs the SQL2 `Parser` into the same `spi-commons` factory, and the result is a `QueryObjectModelTree` inside `JahiaQueryObjectModelImpl`. Below QOM there is no API, only the Lucene translation in `JahiaLuceneQueryFactoryImpl`. QOM is therefore the lower level, and SQL2 is a text form of it.

For Jahia's entry point, QOM is the more indirect path. `getQOMFactory()` adds two `java.lang.reflect.Proxy` layers with reflection on every call, a second `modifyAndOptimizeQuery`, and an implementation that is always rebuilt. Every QOM is formatted to SQL2 at `init` on both paths, and every non-default provider parses that string on both paths. The string path is `QueryWrapper` with one extra `Parser` run.

The measured cost of the two paths is equal. `Bench.java` measured the Java side on JDK 17 after warm-up. A `Parser` run costs 4.4 µs for a 136-character query and 15 µs for a 499-character join query. `QOMFormatter` costs 1.2 to 3.1 µs, and both paths pay it. Seven direct factory calls cost 1.3 µs. `Probe3.java` measured the path from JavaScript on GraalJS 23.0.5 in interpreter mode, with a reflect proxy that mirrors Jahia's handlers over the real factory.

A 15-node query built through the proxy costs 5.9 µs median for 17 host crossings. One host call that parses the same SQL2 also costs 5.9 µs. Query execution is Lucene plus per-hit ACL checks, in milliseconds. The two entry paths tie at about 6 µs, and both are 1 % or less of a query.

The runtime QOM path gives no fidelity gain, because `CAST` carries types through the Parser as `createValue(value, type)` does. Bind variables fail on the QOM proxy path, and `REFERENCE` literals execute as `WEAKREFERENCE` there. `NAME` and `PATH` literals are validated more strictly on the string path, because the Parser uses the session-bound `ValueFactoryQImpl`. The QOM sink runs server-side only, with a live `JCRSessionWrapper`. It needs the java-ts-bind change of section 8, because `getQOMFactory()` and the `javax.jcr.query.qom` types are blacklisted today.

Outcome. Romain confirmed on 2026-09-19 that QOM is the lower level and decided to bind the builder to QOM, see section 13. The consequences are:

- The QOM interop sink is the only execution path for a built query in v1. The string seams keep `createQuery(sql2, "JCR-SQL2")` for string input.
- No TypeScript SQL2 serialiser ships in v1. The statement for logs and tests is `getStatement()` on the built QOM, the `QOMFormatter` output.
- The java-ts-bind change and the regen are phase 0, on the critical path.
- The sink inlines bind variables as typed literals, because `bindValue` fails on the proxy path.
- A `REFERENCE` literal executes as `WEAKREFERENCE` on this path. This is a documented caveat and a lab check.
- Execution is server-only. A client consumer needs a SQL2 serialiser, which is deferred, see section 7.3.

## 4. Design decision (headline)

The design has four parts. They are a pure TypeScript query model, a factory layer that mirrors `QueryObjectModelFactory`, a fluent facade over that factory, and a QOM interop sink. The factory carries `Slow` names for constructs that run in memory, and the facade carries a typed limit state. The sink executes through the session's factory.

```
src/query/model.ts       plain immutable objects, one interface per spec interface
src/query/factory.ts     qom.selector(), qom.comparison(), qom.joinSlow(), ... (28 functions, 5 renamed)
src/query/builder.ts     from("jnt:page", "p").where(...).orderBy(...).limit(10)   -> Executable
        |
        v
src/query/qom.ts         toQOM(model, session, bindings) -> javax.jcr.query.qom.QueryObjectModel
src/query/execute.ts     setLimit / setOffset / execute()  -> QueryWrapper.execute()
```

A plain model is testable in Node without a JVM, and it is JSON-serialisable, so a query can be logged or cached before execution. The sink reaches the factory through the `server` host objects only, and the executed object is the same `JahiaQueryObjectModelImpl` that a parsed string produces. The `Slow` suffix and the limit state make the performance contract visible at the call site and at compile time. The factory layer is the escape hatch for anything the facade does not express, as in ModeShape, see section 15.

Rejected alternatives:

1. A TypeScript SQL2 serialiser as the default execution path. Section 3 shows equal cost and no fidelity gain. A serialiser is also a second implementation of the formatter rules, to keep in step with the fork.
2. A TypeScript SQL2 parser for round trips. Jackrabbit's `Parser` exists server-side and is the oracle, so a second grammar is maintenance debt.
3. JavaScript objects that implement the `javax.jcr.query.qom` interfaces. The rewrite casts to `spi-commons` classes at `QueryServiceImpl.java:172-184`, so those objects would be rejected.

## 5. Developer experience

The eight examples below show the facade and the factory mixed. Each comment gives `getStatement()` as the fork formats it. Every example calls `.limit()`, because a builder without a limit does not compile as a `Queryable`.

```ts
// 1. Property filter
from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home")).limit(20);
// SELECT * FROM [jnt:page] AS p WHERE p.[jcr:title] = 'Home'
// 2. Path scope
from("jnt:news", "n").where(({ n }) => n.isDescendantOf("/sites/acme/contents")).limit(50);
// SELECT * FROM [jnt:news] AS n WHERE ISDESCENDANTNODE(n, ['/sites/acme/contents'])
// 3. Ordering with pages. Every call returns a new builder, so one base serves several pages.
const news = from("jnt:news", "n").orderBy(({ n }) => n.prop("date").desc()).limit(10);
getNodesByJCRQuery(session, news.offset(20)); // SELECT * FROM [jnt:news] AS n ORDER BY n.date DESC
// 4. Full text and score ordering, both sorted in Lucene
from("jnt:article", "a").where(({ a }) => a.contains("graal*")).orderBy(({ a }) => a.score().desc()).limit(10);
// SELECT * FROM [jnt:article] AS a WHERE CONTAINS(a.*, 'graal*') ORDER BY SCORE(a) DESC
// 5. Typed date literal
from("jnt:event", "e").where(({ e }) => e.prop("startDate").ge(date("2026-09-01T00:00:00.000+02:00"))).limit(100);
// SELECT * FROM [jnt:event] AS e WHERE e.startDate >= CAST('2026-09-01T00:00:00.000+02:00' AS DATE)
// 6. Bind variable, replaced by a typed literal in the sink
const upcoming = from("jnt:event", "e").where(({ e }) => e.prop("startDate").ge($("since"))).limit(5);
getNodesByJCRQuery(session, upcoming.bind({ since: date(startOfMonth) }));
// SELECT * FROM [jnt:event] AS e WHERE e.startDate >= CAST('2026-09-01T00:00:00.000+02:00' AS DATE)
// 7. Join, runs in memory. getNodes() returns the nodes of the left selector: pages that have a published child.
from("jnt:page", "p").joinSlow("jnt:content", "c").on(({ c, p }) => c.isChildOf(p))
  .where(({ c }) => c.prop("j:published").eq(true))
  .select(({ p }) => p.all(), ({ c }) => c.prop("jcr:title").as("childTitle"))
  .limit(20);
// SELECT p.*, c.[jcr:title] AS childTitle FROM [jnt:page] AS p INNER JOIN [jnt:content] AS c ON ISCHILDNODE(c, p) WHERE c.[j:published] = true
// 8. NOT and OR, facade and factory mixed, then a LENGTH predicate and a LOWER ordering that run in memory
from("jnt:page", "p").where(({ p }) => and(
  not(p.prop("j:published").eq(true)),
  or(p.prop("jcr:title").like("A%"),
     qom.comparison(qom.lowerCase(qom.propertyValue("p", "jcr:title")), Operator.EQUAL_TO, literal("home"))),
)).whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3))
  .orderBySlow(({ p }) => p.prop("jcr:title").lower().descSlow()).limit(50);
// SELECT * FROM [jnt:page] AS p WHERE (NOT p.[j:published] = true) AND (p.[jcr:title] LIKE 'A%' OR LOWER(p.[jcr:title]) = 'home') AND LENGTH(p.[jcr:title]) > CAST('3' AS LONG) ORDER BY LOWER(p.[jcr:title]) DESC
```

Notes on the examples:

1. The callback receives one typed selector reference per alias. A string literal goes to `createValue(String, STRING)` as a value, so `'` in a title is safe.
2. The fork writes every path as `['...']`. The test view and the blog guide write `'/sites/...'`, and both forms parse to the same tree.
3. `.limit()` and `.offset()` are execution options outside the model, so `news.offset(20)` and `news.offset(30)` are two pages of one query. The ordering on a property is sorted in Lucene, and the work is bounded by `offset + limit`.
4. `SCORE` ordering is native, and `JahiaQueryEngine.java:186-192` corrects the Lucene flag to JCR semantics.
5. `date()` accepts a `Date` or an ISO 8601 string with a zone. `Date.prototype.toISOString()` output is accepted, and a date-only string is rejected by Jackrabbit, per `Probe2.java`.
6. `$("since")` is a `BindVariableValue` in the model, and `.bind()` stores the values in the execution options. The sink replaces each variable with a typed literal before the factory call, because `bindValue` on the QOM proxy fails at execution, see section 2.1. A variable without a binding throws `UNBOUND_VARIABLE` before any host call.
7. `joinSlow` names the in-memory join. Both sides run unbounded, see section 2.4, so the limit only slices the merged rows. A join builder has no `build()` until `.on()` is called, and `getNodesByJCRQuery` returns the left selector's nodes, deduplicated.
8. `j:published` comes from `jmix:lastPublished`, see `02-jahia-nodetypes.cnd:55-57`. `LOWER` in a comparison on a property runs on the index through `CaseTermQuery`, so `qom.comparison` and `.eq()` keep their names. `LENGTH` in a comparison and `LOWER` in an ordering load a node per hit, so `lengthSlow()`, `gtSlow()` and `descSlow()` carry `Slow`. Only `whereSlow()` and `orderBySlow()` accept their output. The parentheses around `NOT` are required, because the Parser reads `NOT a AND b` as `NOT (a AND b)`.

## 6. Type model and factory surface

### 6.1 Model

The model is a set of plain, immutable, JSON-serialisable objects in `src/query/model.ts`. One interface exists per spec interface listed in report A3. The `kind` field holds the spec's simple name, and `S` is a phantom union of selector names with default `string`. A second phantom `P extends "fast" | "slow" = "fast"` marks `Source`, `Constraint` and `Ordering`. It exists at compile time only, and the JSON form does not carry it.

```ts
export type Source<S extends string = string, P extends Speed = Speed> = Selector<S> | Join<S, P>;
export interface Selector<S extends string = string> { kind: "Selector"; nodeTypeName: string; selectorName: S }
export type Constraint<S extends string = string, P extends Speed = Speed> = And<S, P> | Or<S, P> | Not<S, P> | Comparison<S, P> | PropertyExistence<S> | FullTextSearch<S> | SameNode<S> | ChildNode<S> | DescendantNode<S>;
export interface LowerCase<S extends string = string, O extends DynamicOperand<S> = DynamicOperand<S>> { kind: "LowerCase"; operand: O }
export interface Literal { kind: "Literal"; type: LiteralType; value: string }
export type Column<S extends string = string> =
  | { kind: "Column"; selectorName: S; propertyName: null; columnName: null }
  | { kind: "Column"; selectorName: S; propertyName: string; columnName: string | null };
export interface QueryModel<S extends string = string> { kind: "QueryObjectModel"; source: Source<S>; constraint: Constraint<S> | null; orderings: readonly Ordering<S>[]; columns: readonly Column<S>[] }
```

Design notes:

- The fork factory rejects two null shapes: `column(p, null, "alias")` with `columnName must be null if propertyName is null`, and `sameNodeJoinCondition(s1, s2, null)` with `path must not be null`. `Column` is therefore a union, and `SameNodeJoinCondition.selector2Path` is a non-null string with default `"."`, which the Parser also writes.
- `Length` accepts a `PropertyValue` only, as `qom/Length.java:25` does. `FullTextSearch.propertyName`, `Column.propertyName` and `Column.columnName` stay explicit nullable fields, because each `null` changes the statement. `LowerCase` and `UpperCase` carry their operand type, so the fast comparison overload can require a `PropertyValue` at the innermost position.
- Selector, property and column names stay `string`, so `rep:facet(...)`, `rep:filter(` and `jcr:score` remain expressible. The grammar check runs at construction.

### 6.2 Constants and literal types

`Operator`, `JoinType` and `Order` are `as const` objects whose values are the dotted wire strings from `qom/QueryObjectModelConstants.java:15-70`, with derived string-literal unions. java-ts-bind emits no constants, because `fieldWhitelist` is empty at `EJ/.java-ts-bind/package.json:114-116`. `LiteralType` is `"String" | "Long" | "Double" | "Decimal" | "Date" | "Boolean" | "Name" | "Path" | "Reference" | "WeakReference" | "URI"`. One table maps each type to its `PropertyType` code, because the two alphabets differ.

`UNDEFINED` is not representable, because `UNDEFINED` renders to nothing in `QOMFormatter`. `BINARY` is excluded in v1 as a deliberate and reversible choice. A binary literal has no meaningful comparison in Jackrabbit, and report A3 records that fact as recollection. No call site needs binary literals, and a later row in the table adds the type. The exclusion concerns a literal type, not a QOM construct, so decision 4 still holds.

### 6.3 Factory layer

`src/query/factory.ts` exports `qom`, one pure function per `QueryObjectModelFactory` method with the Java parameter order. The spec has 28 methods, see `qom/QueryObjectModelFactory.java`. Five of them carry the suffix `Slow`, because every query that contains their output runs in memory: `joinSlow`, `lengthSlow`, `comparisonSlow`, `ascendingSlow` and `descendingSlow`. The factory keeps the Java arity and semantics, and the renamed subset is a documented deviation from the Java names.

```ts
type FastOperand<S extends string> = PropertyValue<S> | LowerCase<S, FastOperand<S>> | UpperCase<S, FastOperand<S>>;
export const qom = {
  createQuery<S extends string>(source: Source<S>, constraint: Constraint<S> | null = null, orderings: readonly Ordering<S>[] = [], columns: readonly Column<S>[] = []): QueryModel<S>,
  selector<T extends string, S extends string = T>(nodeTypeName: T, selectorName?: S): Selector<S>,
  joinSlow<L extends string, R extends string>(left: Source<L>, right: Source<R>, joinType: JoinType, cond: JoinCondition<L | R>): Join<L | R, "slow">,
  and<A extends string, B extends string, P1 extends Speed, P2 extends Speed>(c1: Constraint<A, P1>, c2: Constraint<B, P2>): And<A | B, P1 | P2>, or, not,
  comparison<S extends string>(operand1: FastOperand<S>, operator: Operator, operand2: StaticOperand): Comparison<S, "fast">,
  comparison<S extends string>(operand1: NodeName<S>, operator: "jcr.operator.equal.to", operand2: StaticOperand): Comparison<S, "fast">,
  comparison<S extends string>(operand1: NodeLocalName<S>, operator: "jcr.operator.equal.to" | "jcr.operator.like", operand2: StaticOperand): Comparison<S, "fast">,
  comparisonSlow<S extends string>(operand1: DynamicOperand<S>, operator: Operator, operand2: StaticOperand): Comparison<S, "slow">,
  lengthSlow(pv: PropertyValue): Length,  lowerCase<S, O>(operand: O): LowerCase<S, O>,  upperCase,  bindVariable(name: string): BindVariableValue,  literal(v: LiteralArg): Literal,
  ascending<S extends string>(operand: PropertyValue<S> | FullTextSearchScore<S>): Ordering<S, "fast">, descending,
  ascendingSlow<S extends string>(operand: DynamicOperand<S>): Ordering<S, "slow">, descendingSlow,
  column<S extends string>(sel: S): Column<S>,  column<S extends string>(sel: S, propertyName: string, columnName?: string | null): Column<S>,  // column(sel, null, "alias") fails at compile time
  // with the Java signatures: equiJoinCondition, sameNodeJoinCondition(s1, s2, selector2Path = "."), childNodeJoinCondition, descendantNodeJoinCondition,
  // propertyExistence, fullTextSearch(sel, prop: string | null, expr), sameNode, childNode, descendantNode, propertyValue, nodeName, nodeLocalName, fullTextSearchScore
} as const;
export const long = (v: number | bigint | string) => Literal; // also double, decimal, date, name, path, reference, weakReference, uri
export function unchecked<A extends string>(c: Constraint<string>): Constraint<A>;
```

The naming rule follows `FORK/LuceneQueryFactory.java:382-403` and `JahiaQueryEngine.java:186-197`:

- `qom.joinSlow` is the only join, because every join runs in memory. `qom.lengthSlow` is the only `LENGTH`, because every comparison on it is a `RowPredicate`.
- `qom.ascending` and `qom.descending` accept a `PropertyValue` or a `FullTextSearchScore` only. `qom.ascendingSlow` and `qom.descendingSlow` accept any `DynamicOperand`, including `LOWER` and `UPPER` over a property, which the comparator evaluates per collected doc.
- The fast `qom.comparison` has three overloads keyed on the operator literal type. They accept any operator over a `FastOperand`, `EQUAL_TO` over `NodeName`, and `EQUAL_TO` or `LIKE` over `NodeLocalName`. `qom.comparisonSlow` accepts any `DynamicOperand` with any operator. `qom.comparison(qom.nodeName("p"), Operator.LIKE, x)` and `qom.comparison(qom.lengthSlow(pv), Operator.EQUAL_TO, x)` are compile errors.
- `LOWER` and `UPPER` over a property are fast in a comparison for every operator, per the four index queries at `FORK/LuceneQueryFactory.java:703-735`. In an ordering they are slow. Over `NAME()` or `LOCALNAME()` they are slow in a comparison, at `:382-403`. Lab check 8 in section 14 confirms the comparison case with a node-load count.

The `selector` signature is the R2 fix. A default parameter `selectorName: S = nodeTypeName` does not compile on TypeScript 5.9.3, error TS2322. `unchecked()` accepts a constraint whose selector name is held in a `string` variable and defers the selector check to `build()`. Other deviations from Java are documented: defaults, `literal` takes JS values, `and` and `or` stay binary, and `and(null, c)` throws as Jackrabbit does.

### 6.4 Fluent facade

`src/query/builder.ts` exports `from()`. Every call returns a new builder, so a builder is never mutated, and the README says so as Kysely does. A builder is never thenable, and `build()` is explicit. The type parameter `B` tracks whether `.limit()` or `.unboundedSlow()` was called, and only a `"limitSet"` builder is an `Executable`.

```ts
type Speed = "fast" | "slow";  type Bound = "noLimit" | "limitSet";
export function from<T extends string, A extends string>(nodeType: T, alias: A): QueryBuilder<A, "noLimit">;
export function from<S extends string>(model: QueryModel<S>): QueryBuilder<S, "noLimit">;  // lifts a factory-built query
interface QueryBuilder<A extends string, B extends Bound> {
  where(c: Arg<A, Constraint<A, "fast">>): QueryBuilder<A, B>;      whereSlow(c: Arg<A, Constraint<A>>): QueryBuilder<A, B>;
  orderBy(...o: Arg<A, Ordering<A, "fast">>[]): QueryBuilder<A, B>;  orderBySlow(...o: Arg<A, Ordering<A>>[]): QueryBuilder<A, B>;
  select(...c: Arg<A, Column<A>>[]): QueryBuilder<A, B>;
  joinSlow<T extends string, C extends string>(nodeType: T, alias: C, joinType?: JoinType): JoinClause<A, C, B>;  // JoinClause has on(cond) only
  limit(n: number): QueryBuilder<A, "limitSet">;   unboundedSlow(): QueryBuilder<A, "limitSet">;   // unboundedSlow stores -1
  offset(n: number): QueryBuilder<A, B>;          bind(values: Bindings): QueryBuilder<A, B>;
  build(options?: { strict?: boolean }): QueryModel<A>;   diagnose(): Diagnostic[];
  readonly model: QueryModel<A>;  readonly execution: { limit?: number; offset?: number; bindings?: Bindings };
}
export type Executable<A extends string = string> = QueryBuilder<A, "limitSet">;   export type Queryable = string | Executable;
type Arg<A extends string, N> = N | ((s: { readonly [K in A]: SelectorRef<K> }) => N);
type LiteralArg = string | number | boolean | bigint | Date | Literal | BindVariableValue;   type Bindings = Record<string, Exclude<LiteralArg, BindVariableValue>>;
```

`SelectorRef<K>` gives `prop(name)`, `contains(expr)`, `all()`, `isDescendantOf(pathOrRef)`, `isChildOf(pathOrRef)`, `isSameAs(ref, path = ".")`, `name()`, `localName()` and `score()`. The reference forms of the three path methods return join conditions. `PropertyRef` has the fast methods `eq`, `ne`, `lt`, `le`, `gt`, `ge`, `like`, `asc()`, `desc()`, `exists()`, `contains()`, `equals(otherProp)` and `as(columnName?)`. Its `lengthSlow()` returns a `LengthRef`, with the same name rule as `qom.lengthSlow`. Its `lower()` and `upper()` return a `CaseRef` with the same fast comparisons and `ascSlow()` and `descSlow()`.

`NameRef` has a fast `eq` only, `LocalNameRef` has fast `eq` and `like`, `ScoreRef` has fast `asc()` and `desc()`, and `LengthRef` has no fast method. Every other method on those four references carries the `Slow` suffix, such as `gtSlow` or `descSlow()`.

The `alias` parameter is required, so the callback never needs `({ "jnt:page": p })` destructuring. The alias-less form `SELECT * FROM [jnt:page]` stays reachable through `qom.selector("jnt:page")`. `NameRef` and `LocalNameRef` have no `lower()` or `upper()`, because those transforms move the comparison into memory. The factory path `qom.comparisonSlow(qom.lowerCase(qom.nodeName("p")), ...)` expresses them. Top-level helpers are `and(...c)`, `or(...c)`, `not(c)` and `$(name)`, and `and`, `or` and `not` propagate `"slow"` when any child is `"slow"`. `.limit()`, `.offset()` and `.bind()` write to `execution` and never to `model`, so `toQOM` never sees them.

### 6.5 Type safety and validation

Compile time. R2 verified five items on TypeScript 5.9.3. `Operator`, `JoinType` and `Order` are string-literal unions, `lengthSlow()` exists on `PropertyRef` only, and a join has no `build()` until `.on()` is called. `where()` rejects an undeclared alias in `s.q` or a factory-built `Constraint<"q">`. Union inference holds through nested `and` and `or` with facade and factory nodes mixed. Three items are new in this revision, and each gets a `@ts-expect-error` fixture in phase 1:

- `getNodesByJCRQuery(session, builder)` does not compile before `.limit(n)` or `.unboundedSlow()`, because `Queryable` accepts `QueryBuilder<A, "limitSet">` only. R2 verified that `QueryBuilder<"n">` is assignable to `QueryBuilder<string>`, and the two-parameter form needs the same check.
- `where()` rejects a `"slow"` constraint, and `orderBy()` rejects a `"slow"` ordering.
- The fast `qom.comparison` rejects `Length`, `FullTextSearchScore`, `NodeName` outside `=`, and `NodeLocalName` outside `=` and `LIKE`.

Literal inference: `string` gives `String`, `boolean` gives `Boolean`, `bigint` gives `Long`, `Date` gives `Date` through `toISOString()`. A `number` gives `Long` when `Number.isInteger` is true and `Double` otherwise. A `number` beyond `MAX_SAFE_INTEGER` throws `LITERAL_PRECISION`. Explicit constructors exist for every type, and the README documents the silent no-match of a `Double` literal against a `Long` property.

Construction time: each `qom.*` function validates its arguments and throws `QueryError`. The checks are the JCR name grammar for node types, selectors and properties, and a looser grammar for column names. A path must be absolute, a constraint must be non-null, and a `Column` must match the union of section 6.1. Build time: duplicate selectors, undeclared selectors, join sides that share an alias, and the diagnostics of section 6.6 under `strict: true`. Node type existence and namespace prefixes are not checked in TypeScript. `QueryError extends Error` carries a `code` from `"INVALID_NAME" | "INVALID_PATH" | "INVALID_COLUMN" | "NULL_CONSTRAINT" | "UNDECLARED_SELECTOR" | "DUPLICATE_SELECTOR" | "MISSING_JOIN_CONDITION" | "LITERAL_PRECISION" | "UNBOUND_VARIABLE" | "LIMIT_CONFLICT" | "UNSUPPORTED"`, an `at` path into the model, and an optional `statement` string when one exists.

### 6.6 Mechanism for decision 4

Every construct exists in the model and in the factory, and support has three signals. The first signal is the `Slow` suffix in the name, for every construct that Jackrabbit runs in memory. Those constructs are joins, `LENGTH`, and comparisons on `SCORE`, `NAME()` and `LOCALNAME()` outside their index operators. Orderings on an operand other than a property or `SCORE()`, and an unbounded execution, complete the list. The second signal is `diagnose(model, execution?)`, which returns `Diagnostic[]` with `{ level: "none" | "partial" | "deep-offset" | "full-scan" | "environment"; at: string; reason: string }`. The third signal is JSDoc `@remarks Jahia support: ...` on each function, and no construct is `@deprecated`.

- `none`: the query fails. The cases are `NAME()` with `LIKE` and no transform, and `jcr:language = $var`. The third case is `NOT` or `UPPER` around a property that the rewriter redirects to a `jnt:translation` join selector.
- `partial`: the query runs with different semantics. The cases are `<>` on multi-valued properties, nested `LOWER(UPPER(x))`, `RIGHT OUTER` joins, and `reference()`, which executes as a weak reference.
- `deep-offset`: `offset > 32768`, where the search runs again with a doubled heap. `full-scan`: a `rep:facet` column, or a `rep:count` column without `approximate=1`.
- `environment`: one fixed entry that lists the four conditions the model cannot show: `useNativeSort=false`, extra providers, render mode, and session locale. A reader sees them next to the model findings.

`build({ strict: true })` throws on `none`, and `executeQuery` throws `UNSUPPORTED` on `none`. No runtime warning exists for a `Slow` construct, because the name is the warning.

## 7. Sinks

### 7.1 QOM interop sink

`src/query/qom.ts` is server-only and the v1 execution path for a built query. `toQOM(model, session, bindings?)` obtains the factory with `session.getWorkspace().getQueryManager().getQOMFactory()`, which is Jahia's proxy over the default provider. It obtains the value factory with `session.getValueFactory()`, the `JCRValueFactoryImpl` singleton. A post-order walk then calls one factory method per node:

- A `Literal` becomes `f.literal(vf.createValue(String(value), code))`, because `createValue(42, 3)` has no applicable overload and `createValue('42', 3)` works. The `code` is the `PropertyType` constant from the table of section 6.2.
- A `BindVariableValue` is replaced by its bound value as a typed literal before the factory call. A missing binding throws `UNBOUND_VARIABLE` before any host call.
- Empty slots receive an explicit `null`, and JavaScript arrays convert to `Ordering[]` and `Column[]`. The generated signatures are not nullable, so `qom.ts` declares a local `QOMFactoryLike` that narrows `createQuery` and `column`, and casts the factory once. This is the technique section 7.2 already uses for `QueryResultLike`. Phase 0 verified that patching the generated declarations instead would work, and rejected it: the patch would change the published types of the whole library for two call sites.
- An empty column list becomes one `f.column(sel, null, null)` per selector, as the Parser does for `SELECT *` over a join. The emitted `column()` takes three parameters, so the two empty slots are explicit. The i18n rewrite then sees a property-based node on each selector at `QueryModifierAndOptimizerVisitor.java:674-681`.
- The only text form of a built query is `getStatement()`, the `QOMFormatter` output. `executeQuery` logs it at debug level, and the lab tests snapshot it.

The value factory is type-only, so the TypeScript grammar check is the only name and path validation on this sink. A `REFERENCE` literal executes as `WEAKREFERENCE`, see `JCRValueFactoryImpl.java:96-99`, and `diagnose()` reports it as `partial`.

### 7.2 Execution entry

`src/query/execute.ts` is internal in v1, and the public seams are `getNodesByJCRQuery` and `useJCRQuery`. `executeQuery(session, input)` takes either `{ statement: string; limit: number; offset: number }` from a string seam or an `Executable`. It is the sole caller of `setLimit` and `setOffset`: it calls `setLimit(limit)` when `limit >= 0`, `setOffset(offset)` when `offset > 0`, and then `execute()`. A string input goes through `createQuery(statement, "JCR-SQL2")`, as `getNodesByJCRQuery.ts:29` does today, and an `Executable` goes through `toQOM`. No layer slices in JavaScript.

The spec types `execute()` as `javax.jcr.query.QueryResult`, and the runtime object is Jahia's `QueryResultWrapper`, so `executeQuery` casts once to a local `QueryResultLike` with `getNodes()` and `getRows()`. `getApproxCount()` is not exposed, because it returns `0` at `JahiaQueryEngine.java:148`. A join executes through `getNodes()` and yields the left selector's nodes, deduplicated, because `QueryResultAdapter` returns the node of `getSelectorNames()[0]` and `QueryEngine.getSelectorNames` lists left then right. `getRows()` gives column access and the `CountRow` of a `rep:count` query, and phase 0 adds it to the generated types.

### 7.3 Later: SQL2 serialiser

A TypeScript SQL2 serialiser is deferred. Its trigger is a client-side consumer, such as GraphQL `nodesByQuery`, which takes a string at `graphql-dxm-provider/src/main/java/org/jahia/modules/graphql/provider/dxm/node/GqlJcrQuery.java:230-235` and runs unbounded today, see section 2.4. When it ships, a round-trip check compares `toQOM(m, session).getStatement()` with `toSql2(m)` after a server-side parse and reformat of both strings. `REFERENCE` and `WEAKREFERENCE` are normalised before the comparison, and byte equality is never asserted, because `getStatement()` omits some casts, see JCR-2996 in section 15.

## 8. Library integration

File layout under `LIB/src/query/`, which follows the one-file-per-function layout of `LIB/src/utils/jcr/`:

- Pure TypeScript: `model.ts`, `constants.ts`, `literal.ts`, `factory.ts`, `builder.ts`, `validate.ts`, `diagnostics.ts`, `index.ts`.
- Host interop only: `qom.ts` and `execute.ts`. They carry plain names, because the library on `main` is server-only as a whole and has no `.server.ts` file, see section 2.2.
- Unit tests: `*.spec.ts`, excluded from the publish build by `LIB/tsconfig.json:29`.

`LIB/src/index.ts` gains a `// Query builder` group after the `// JCR utils` group at `:22-25`. It exports the names below, plus `export type` for `QueryModel`, `QueryBuilder`, `Executable`, `Queryable`, `Constraint` and the other model types:

```
from, qom, and, or, not, $, unchecked, literal, long, double, decimal, date, name, path,
reference, weakReference, uri, Operator, JoinType, Order, diagnose, QueryError
```

A new ESLint block in `JSM/eslint.config.js`, after the library block at `:53-57`, enforces the purity of the model files. It applies to `javascript-modules-library/src/query/**/*.ts` minus `qom.ts` and `execute.ts`, with `no-restricted-globals` on `server` and `no-restricted-imports` on the Java package specifiers such as `org.jahia.services.content`, with `allowTypeImports: true`. The server-runtime-boundary lint of `INT/eslint.config.js:142-171` restricts browser and Node globals in `*.server.*` files. When that lint lands on `main`, a follow-up renames the two sink files to `qom.server.ts` and `execute.server.ts` and aligns the purity block with it.

Client exposure is a later sibling pure package. The client guard at `vite-plugin/src/index.ts:169-175`, the SSR externalisation at `:211` and the `rolldown.config.mjs:91-108` resolution all match the package name exactly. A subpath export would break all three.

Adoption at the seams:

- `getNodesByJCRQuery(session, query: Queryable, limit?, offset = 0)`. A string keeps today's behaviour: the falsy-limit guard, `-1` for all, and the string path of section 7.2. An `Executable` carries its own limit and offset, and a positional value together with a carried value throws `LIMIT_CONFLICT`. There is no fifth parameter, because bindings travel on the builder.
- `useJCRQuery` gets three overload signatures. `useJCRQuery({ query: string })` is marked `@deprecated` and keeps `-1`, and `useJCRQuery({ query: string; limit: number; offset?: number })` is the recommended string form. `useJCRQuery({ query: Executable })` reads the carried values, and its type has no `limit` or `offset`. The runtime throws `LIMIT_CONFLICT` when a JavaScript caller passes both.
- A `TestQueryBuilder.tsx` view in the test module follows the `jahia-test-module/settings/definitions.cnd:66` pattern.

Content patches are a follow-up, after `local/integration` lands on `main`, because the framework does not exist on the worktree. The follow-up makes `QuerySelection.query` a `Queryable` and lets `NodeSelection.where` accept `string | Constraint<"n"> | ((s: Selectors<"n">) => Constraint<"n">)`. A `Constraint` or a callback goes through `from(nodeType, "n").where(({ n }) => n.isDescendantOf(scope)).where(where)`, and the snapshot loop adds `.limit(PAGE).offset(offset)`. A string `where` is a raw SQL2 fragment, which the builder never accepts. `buildQuery` and `escapeSql2Literal` at `INT/.../jcr.ts:21-34` therefore stay for the string form only, marked `@deprecated`.

The loop keeps paging identifiers before any mutation, with two fixes from the deep dive. It stops on `getSize()` instead of the delivered count at `jcr.ts:90`. It also adds `not(n.prop("jcr:language").exists())`, so that a system session without a locale scans one doc per node. The post-query `includeSubtypes` check at `jcr.ts:62-63` is unchanged.

java-ts-bind changes, phase 0 and on the critical path, in `EJ/.java-ts-bind/package.json`:

1. Remove the `blacklist` entries `javax.jcr.query.Query`, `javax.jcr.query.qom.QueryObjectModel` and `javax.jcr.query.qom.QueryObjectModelFactory` at `:429`, `:431` and `:432`, after the JS-modules team confirms that no product decision is behind them. Keep `:430 QueryManager`.
2. Add `javax.jcr.query.qom` and `javax.jcr.query.Query` to `include`. `javax.jcr.Value` at `:68` already prefix-covers `ValueFactory`.
3. Add to `methodWhitelist`: `QueryManagerWrapper.getQOMFactory`, `JCRSessionWrapper.getValueFactory`, `javax.jcr.ValueFactory.createValue` and `org.jahia.services.query.QueryResultWrapper.getRows`. Also add `javax.jcr.query.Query.bindValue`, `execute`, `getStatement`, `setLimit` and `setOffset`, because a subtype only inherits a member that the parent type itself emitted, so the `QueryObjectModel` entries alone produce the four getters and none of the five execution methods. Also add `javax.jcr.query.Row.get.*`, `RowIterator.nextRow` and `RowIterator.getSize`, without which `getRows()` returns a type with no members. Also add every method of `javax.jcr.query.qom.QueryObjectModelFactory`, every getter of the `javax.jcr.query.qom` types, and the `execute`, `setLimit`, `setOffset`, `bindValue` and `getStatement` methods of `javax.jcr.query.qom.QueryObjectModel`. The fork copies an inherited method into a subtype when `<subtype>.<method>` matches, so the subtype-named entries are correct.
4. Add regen assertions: `tsc --noEmit --skipLibCheck false` over `target/types`, because `skipLibCheck: true` at `LIB/tsconfig.json:11` hides a broken `.d.ts`. Phase 0 found five pre-existing errors on an untouched baseline, four dangling imports and one missing `java.util` member, so this check cannot gate the build until they are fixed. Phase 0 recorded the baseline instead and asserts that a change adds no new error. Make `apply-patch.sh:63-69` fail when a search matches zero files, and remove the entries that match nothing on the worktree output.

Documentation follows the worktree conventions. `LIB/README.md` groups exports under `##` headings with one `###` per export, so it gains a `## Query builder` group. The guide is `docs/2-guides/4-querying/README.md`, with the academy front matter of `docs/2-guides/3-i18n/README.md:1-8`, because `docs/2-guides/` holds three guides today. `docs/adr/` does not exist on `main`, so phase 2 creates it and writes the ADR in MADR form, numbered at merge time. The changelog entry is a `.chachalog/<id>.md` file with `javascript-modules: minor`, in the format of the existing entries.

The guide documents two total-count patterns without a count API. The first is over-fetch `limit + 1` and read `getSize()` for `hasMore`. The second is a sibling `rep:count(approximate=1)` query through `getRows()` as an order-of-magnitude indicator, with the `wasApproxLimitReached` flag and the biases of section 2.5. The guide also documents keyset pagination and the identifier snapshot as patterns, with the `jcr:language` constraint and `ORDER BY n.[jcr:uuid]` as the stable tiebreaker.

## 9. Tooling and dev loop

- Build and lint: `tsc && node post-build.js && yarn pack --out dist/package.tgz && publint`, unchanged, see `LIB/package.json:23`, and `yarn lint` from the repository root, which runs the new purity block with the existing rules. Extra compiled test files never reach the engine bundle, because rolldown resolves `internal-dist/index.js` only at `rolldown.config.mjs:99-108`.
- Unit tests: add `tsconfig.test.json` that extends `tsconfig.json` with `include: ["src/**/*.ts"]`, `outDir: target/test-dist` and `declaration: false`. The script is `"test": "tsc -p tsconfig.test.json && node --test target/test-dist"`. The `// @ts-expect-error` fixtures run in the same `tsc` pass.
- Regen of the generated types: the engine-java Maven build at `EJ/pom.xml:339-364`, followed by the assertions of section 8. The first run downloads the `jdk17u` source zip at `EJ/pom.xml:229-244`.
- Lab: the Docker stack in `JSM/tests/docker-compose.yml` with the test module deployed, and Cypress through `JSM/tests/package.json:11-18`. The sink has no Node test, because it needs a live session.

## 10. Testing strategy

- Unit tests run in Node without a JVM, over the pure layers. They cover:
  - every `QueryError` code with its `at` field, literal inference and `LITERAL_PRECISION`,
  - the diagnostics matrix of section 6.6, builder immutability, and a JSON round trip of the model,
  - `.limit()`, `.offset()` and `.bind()` never enter the model, and a positional limit together with a carried limit throws `LIMIT_CONFLICT`,
  - `@ts-expect-error` fixtures: a phantom selector, no `Queryable` before `.limit()`, `where()` and `orderBy()` reject a `"slow"` node, and `qom.comparison` rejects the operands of section 6.5.
- Integration tests run on the Docker lab with Cypress and a test-module view in the `getNodesByJCRQueryTest` pattern. They cover:
  - each example of section 5 through the QOM sink, with a `getStatement()` snapshot assertion per example. The node UUID set is asserted against the parsed statement,
  - `createValue(String, int)` per type, bind inlining, and a join through `getNodes()` that returns left-selector nodes,
  - i18n parity of one wildcard column per selector against a parsed `SELECT *` on a 3-language site, with `limit` below the number of distinct nodes,
  - `offset=2, limit=2` with `ORDER BY n.[jcr:uuid]` returns the same page over three runs. For a preview `?alias=` user who lacks read, `setLimit(size + 1)` gives `getSize() == size + 1` while the returned array is shorter,
  - the existing cases at `tests/cypress/e2e/ui/getNodesByJCRQueryTest.cy.ts:64-106` keep passing, with a note that the offset cases at `:88-106` rely on the doc-id tiebreak.
- Negative tests: every `none` construct fails as the matrix says, and the `@deprecated` overload of `useJCRQuery` compiles with a deprecation report. The lab checks that precede the build are in section 14.

## 11. Delivery phases

| Phase | Content | Size |
|---|---|---|
| 0, regen | Phase 0 makes the java-ts-bind change of section 8 and runs a regen with assertions, then diffs the emitted `.d.ts` set. The assertions check the five `QueryObjectModel` methods, `QueryManagerWrapper.getQOMFactory`, `JCRSessionWrapper.getValueFactory`, `ValueFactory.createValue(String, int)` and `QueryResultWrapper.getRows`. They also check that `ValueFactory` and `Node` have no duplicate overloads. A smoke test of `createValue(String, int)` runs on the lab, and the regen is timed. | 1 to 2 days |
| 1, core | Phase 1 delivers the model, constants, literals, the factory with the `Slow` names, validation and `diagnose()`. It adds `tsconfig.test.json`, `node --test`, the ESLint purity block, and the unit tests with the type fixtures. | 4 to 5 days |
| 2, sink and seams | Phase 2 delivers the builder, `toQOM`, `executeQuery`, `Queryable` in `getNodesByJCRQuery` and the three `useJCRQuery` overloads. It adds the test-module view, Cypress with the `getStatement()` snapshots, the README group, the guide, the ADR and the changelog entry. | 4 to 5 days |
| Follow-up | The follow-up runs after `local/integration` lands on `main`. It adopts the builder in the content patches with the two `jcr.ts` fixes of section 8. It also renames the two sink files to `*.server.ts` and aligns the purity block with the boundary lint. | 1 to 2 days |
| Later | Later work is sized separately. It holds the SQL2 serialiser with its round-trip check, triggered by a client consumer, and the pagination helpers `fetchPage`, `after(cursor)` and `iterateIdentifiers`. It also holds an `ext` namespace for `rep:facet`, `rep:filter` and `jcr:score`, and schema typing generated from CND. A sibling pure package with `sideEffects: false`, and native `bindValue` on the QOM path if a live check passes, complete the list. | Sized separately |

v1 is phases 0 to 2, about 9 to 12 days. Phase 0 is on the critical path, because phase 2 depends on the generated types, and it can run alongside phase 1. Each phase ends with one Conventional-Commits commit on `feat/jcr-query-builder`, per the working mode in section 13.

## 12. Risks and mitigations

- `bindValue` fails on the QOM proxy path, see section 2.1. Mitigation: the sink inlines typed literals, and a lab check confirms the failure before the build.
- A `REFERENCE` literal executes as `WEAKREFERENCE` on the sink. Mitigation: a README caveat, a `partial` diagnostic, and a lab check.
- The java-ts-bind regen is on the critical path, it changes other emitted `.d.ts` files, and `flattenType` may need the parent type. Mitigation: phase 0 runs first with the diff and the `tsc` assertions, and a regen failure blocks phase 2 only.
- The blacklist entries may record a product decision. Mitigation: the JS-modules team confirms before phase 0 removes them.
- `getStatement()` snapshots drift across fork versions, and the 8.2.1 branch runs `2.20.12-jahia1`. Mitigation: a rerun of `Probe3.java` against that version before the build, and one snapshot set per fork version.
- A `Double` literal against a `Long` property matches nothing. Mitigation: explicit constructors, a README note, and CND schema typing later.
- i18n parity of a factory-built query. Mitigation: one wildcard column per selector on the sink. The refill of `SortedLuceneQueryHits` doubles at `:130-133` and dedup precedes the local limit, so results are not truncated. A live check stays in phase 2.
- Translated content doubles the hit stream for a query without an internationalised property, and it reorders rows inside a page, at `QueryModifierAndOptimizerVisitor.java:657-712` and `JahiaLuceneQueryFactoryImpl.java:371-379`. Mitigation: the guide and the content patches constrain `jcr:language`, and a lab check measures the refill and the reorder.
- A drop at wrap time shortens a page, at `NodeIteratorWrapper.java:95-99`, in preview with `?alias=`, for a `j:isExternalProviderRoot` node, or for a live visibility check. Mitigation: the guide reads `getSize()` for `hasMore`, and the content-patch loop stops on `getSize()`.
- Two environment conditions are not visible from the model. A page past provider 1 on a multi-provider install re-runs provider 1 without limit, at `QueryWrapper.java:401-402`, and `jahia.jackrabbit.useNativeSort=false` sorts every ordered query in memory. Mitigation: the `environment` diagnostic, the README, and a lab dump of the provider list.
- `useJCRQuery` with a string stays unbounded until callers move. Mitigation: the `@deprecated` overload and the recommended form with `limit`.
- Pages without `ORDER BY` change after a reindex, because a tie breaks on the Lucene doc id. Mitigation: the guide recommends `ORDER BY n.[jcr:uuid]` as the tiebreaker.
- `local/integration` lands on `main` during v1 and brings the boundary lint and the content patches. Mitigation: the sink files have plain names that the lint does not affect, and the follow-up row of section 11 holds the adoption.
- API freeze with no external user. Mitigation: the facade is `@experimental` for one minor version.
- Name validation rejects an extension string such as `rep:facet(...)`. Mitigation: a looser column-name grammar, and `ext` helpers later.

## 13. Decisions

Resolved 2026-09-18, in Romain's words:

1. Location. Romain chose "In javascript-modules-library (Recommended)". The option text was: a pure-TS `src/query/` sub-module exported by `@jahia/javascript-modules-library`, next to `getNodesByJCRQuery` and `useJCRQuery`, which learn to accept a built query.
2. Execution sink. Romain wrote "whatever is lowest level, pretty sure it's qom to avoid too muck proxying and perf limitations, so 2, but doublecheck". Option 2 was: build a real `javax.jcr.query.qom.QueryObjectModel` server-side via GraalJS interop and execute it directly. That option has no string generation and is server-only, and java-ts-bind must first be taught to emit `javax.jcr.query.qom` types. Section 3 is the doublecheck.
3. API surface. Romain chose "QOM factory + fluent facade (Recommended)". The option text was: low-level functions mirroring `QueryObjectModelFactory` plus a chainable facade like `from("jnt:page","p").where(...).orderBy(...)` producing the same model.
4. Coverage. Romain chose "Full JCR 2.0 QOM, flag unsupported (Recommended)". The option text was: every Source, Constraint, Operand, Ordering and Column in the spec, including joins. Constructs that Jahia's Jackrabbit does not execute are documented and, where possible, typed as such.

Resolved 2026-09-19, in Romain's words:

5. Guiding principle. Romain wrote "I prefer to have less features, but ensure that by default, developers using the new jsm builder spi will get good performances. As I think you suggested, explicitely suffix spi that are not pushed down by \"slow\"".
6. Sink. Romain wrote "confirm that QOM is lower level than sql2. If yes, we want to bind the builder spi to QOM, not to sql2." Section 3 gives the confirmation. A SQL2 string is always parsed into a QOM tree, the Lucene translation consumes QOM, and there is no API below QOM. Jahia's `getQOMFactory()` entry point saves no work, and both paths cost about 6 µs. The builder therefore binds to QOM, with the consequences listed in section 3.
7. Unbounded queries. Romain chose "limit() required, typed (Recommended)". A built query cannot be executed until `.limit(n)` was called, and the builder's type state enforces it at compile time. The explicit escape hatch is `.unboundedSlow()`, and `offset` stays optional.
8. Slow suffix. Romain chose "Facade and factory (Recommended)". Every public function that produces a construct that is not pushed down is suffixed `Slow` in both layers. The factory keeps the Java arity and semantics, and the renamed subset is a documented deviation from the Java names.
9. Legacy seams. Romain wrote "2 , but deprecate useJCRQuery without limit / offset if possible". Option 2 was: `useJCRQuery` gains `{ query, limit, offset }`, defaulting to `-1` for strings for backward compatibility. The deprecation is possible through TypeScript overload signatures: the overload without `limit` and `offset` is marked `@deprecated`, and the recommended overload requires `limit`. `getNodesByJCRQuery` keeps its string behaviour, and a built query passed to either seam carries its own limit and offset. A positional value together with a carried value throws.

Working mode, decided 2026-09-19, in Romain's words:

- Branch: "feat/jcr-query-builder from main (Recommended)". The implementation happens in a git worktree of `origin/main` at `/Users/romaingauthier/dev/javascript-modules-jcr-query-builder`, also reachable as `sources/javascript-modules-jcr-query-builder`, branch `feat/jcr-query-builder`, head `e3db20f`. This plan file lives there.
- Commits: "1 with PRs". Option 1 was: one Conventional-Commits commit per completed phase, no push, and Romain adds the PRs.
- Phases: "Run through, stop only on blockers".
- Assumption for this work, in Romain's words: "assuming for now that jahia-private / jackrabbit won't change".

Defaults taken on 2026-09-19, veto if wrong:

- Number literals: infer `Long` for a safe integer and `Double` otherwise, with the explicit constructors `long()`, `double()` and `decimal()` available. Validation timing: eager local checks in `qom.*`, and cross-node checks at `build()`.
- Flag-unsupported mechanism: the `Slow` suffix for constructs that are not pushed down, plus `diagnose()` for what the model cannot show, and no `@deprecated` on constructs. The four hidden conditions are `useNativeSort=false`, extra providers, render mode and session locale.
- `Queryable` accepts a builder: yes, once `.limit()` or `.unboundedSlow()` was called. Facade `@experimental` for one minor version: yes.
- Joins in v1: yes, as `joinSlow`, executed through `getNodes()`, with the `getRows()` typing fix in phase 0. Wildcard column on the QOM sink: one per selector. Facade alias: required, `from(type, alias)`.
- Client exposure, the GraphQL `nodesByQuery` consumer: not in v1. The QOM sink is server-only, the GraphQL path runs unbounded today, and a SQL2 serialiser is the deferred prerequisite.
- Schema typing from CND, and the pagination helpers `fetchPage`, `after(cursor)` and `iterateIdentifiers`: later, and not requested.
- `executeQuery`: internal in v1 and the sole caller of `setLimit` and `setOffset`. The public seams are `getNodesByJCRQuery` and `useJCRQuery`.
- Test runner: `tsc -p tsconfig.test.json && node --test` for the pure layers. The sink is tested on the Docker lab through the test module and Cypress, with `getStatement()` snapshot assertions in place of the former round-trip oracle.
- java-ts-bind blacklist entries for `getQOMFactory` and `javax.jcr.query.qom`: removed in phase 0, after the JS-modules team confirms that no product decision is behind them.
- Bindings: `BindVariableValue` stays in the model for full coverage, and the execution options carry a bindings map. The sink inlines the values, and the string seams have no bindings parameter.
- Content patches: a follow-up after `local/integration` lands, see sections 8 and 11. The string form of `NodeSelection.where` keeps the legacy concatenation path marked `@deprecated`. The snapshot loop keeps paging identifiers before mutation, with the two fixes of section 8.
- Total count: no count API in v1. The guide documents two patterns: over-fetch `limit + 1` for `hasMore`, and a sibling `rep:count(approximate=1)` query through `getRows()` as an order-of-magnitude indicator. That indicator comes with `wasApproxLimitReached` and the documented biases. An exact count is O(N) and is not offered.
- Locations on the worktree: the sink files are `qom.ts` and `execute.ts`, renamed to `*.server.ts` in the follow-up when the boundary lint lands. `docs/adr/` is created in phase 2, because `main` has none, and the ADR number is assigned at merge time. The guide is `docs/2-guides/4-querying/README.md`, the next free number.

Open decisions: none. Every item that was open on 2026-09-18 is resolved above or taken as a default. The remaining unknowns are lab checks, listed in section 14.

## 14. Assumptions

- Jahia 8.2.1.0 is the floor. The 8.2.1 branch is byte-identical to `main` for `QueryManagerImpl`, `QueryWrapper`, `QueryResultAdapter`, `QueryModifierAndOptimizerVisitor`, `JahiaQueryEngine`, `JCRValueFactoryImpl`, `QueryManagerWrapper` and `JahiaQueryObjectModelImpl`, per `git diff --stat`.
- `jahia-private` and the Jackrabbit fork do not change during this work, per Romain's words in section 13, so every `CORE` and `FORK` pointer stays valid. The fork jar `jackrabbit-core-2.22.0-jahia1.jar` is built from tag `2.22.0-jahia1`, whose source this plan cites as `FORK`.
- `origin/main` at `e3db20f` is the base. It lacks the content-patches framework and the server-runtime-boundary lint of `local/integration`, and section 11 holds the follow-up for both.
- Jahia's engine runs GraalJS in interpreter mode, as `js-23.0.5` on a stock JDK, so the probe timings transfer. A compiled runtime would shrink the JavaScript side of both paths.
- The java-ts-bind blacklist entries carry no QOM-specific product decision. The JS-modules team confirms this before phase 0.
- `SettingsBean.load()` runs before the first load of `JahiaQueryEngine`, so the `true` default of `useNativeSort` is in effect. Only `JahiaQueryObjectModelImpl.java:113` references the class, and this was reasoned from code and from the passing offset tests.
- The string path's `QValueFactory.create(String, int)` has the same ISO 8601 strictness as the probed `AbstractValueFactory`. A one-line lab check confirms this.
- The current call sites are the only design pressure on the API, because no npm package builds JCR-SQL2 or QOM today.

Verify before build, on the Docker lab, in priority order:

1. `bindValue` on the QOM proxy path. Build a `$var` query through `getQOMFactory()`, call `bindValue`, and confirm the `Unknown bind variable` failure at execution.
2. `REFERENCE` literal behaviour. Compare `reference(uuid)` and `weakReference(uuid)` results through the sink, and read the statement type.
3. `useNativeSort` initialisation order. Enable DEBUG on `org.apache.jackrabbit.core.query.lucene.join.QueryEngine` and read "native sort is true" in the execute log at `FORK/join/QueryEngine.java:117-118`. Read `jahia.properties` in the lab image for `jahia.jackrabbit.useNativeSort`.
4. Native `ORDER BY` push-down. Run an ordered `limit 10` query on more than 50000 nodes and count the `getHits()` calls at `FORK/SortedLuceneQueryHits.java:154-166`. Repeat in a localised session without an internationalised property, expect a second call, and confirm that `NOT n.[jcr:language] IS NOT NULL` removes it.
5. Approximate count bias. Run `SELECT count AS [rep:count(approximate=1)]` and `rep:count()` over more than 100 readable nodes. Compare the estimate with the exact count and with the `2x` low bias of section 2.5.
6. Regen diff assertions. Run the phase 0 regen and the `tsc` assertions of section 8, and diff the emitted `.d.ts` set.
7. Translation in-page reorder. In a localised session, run `ORDER BY n.[jcr:lastModified]` with page size 10 on a node whose translation was modified after the parent. Compare the returned order with the `ORDER BY` order, with and without the language constraint.
8. `LOWER` and `UPPER` push-down. Compare `ORDER BY LOWER(n.[jcr:title])` with `ORDER BY n.[jcr:title]`, and `LOWER(n.[jcr:title]) = 'a'` with `n.[jcr:title] = 'a'`, on 10000 nodes, and count the node loads.
9. `getRows()` from JavaScript. Run `result.getRows().nextRow().getValue("rep:count(approximate=1)").getLong()` in the test module, and check the behaviour on more than 100 nodes.
10. Shortened page. In preview with `?alias=` for a user who lacks read, run `setLimit(size + 1)` and confirm `getSize() == size + 1` while the returned array is shorter. Repeat with a `j:isExternalProviderRoot` node in a full page of 1000.
11. Providers and ISO 8601 strictness. Dump `JCRSessionFactory.getInstance().getProviderList()`, and if more than `default` exists, test a page past provider 1. Then confirm the `QValueFactory` ISO 8601 strictness on the string path, one line.

## 15. Prior art

- Jahia `QOMBuilder` at `CORE/org/jahia/services/query/QOMBuilder.java:64-198` is a mutable accumulator with `void` mutators and exposed lists. The JSP query taglib is a per-node declarative facade over the factory. This plan copies the default `AND` folding and rejects the mutable shape.
- Jackrabbit `QOMFormatter` and `Parser` in `org.apache.jackrabbit.commons.query.sql2` are the round-trip pair, see the [QOMFormatter javadoc](http://jackrabbit.apache.org/api/trunk/org/apache/jackrabbit/commons/query/sql2/QOMFormatter.html). The round trip is lossy for some casts, see [JCR-2996](https://issues.apache.org/jira/browse/JCR-2996). The `QOMTreeVisitor` over a closed node set is the reference for the exhaustive walk in `toQOM`.
- ModeShape [QueryBuilder](https://docs.jboss.org/modeshape/4.0.0.Final/api/org/modeshape/jcr/query/QueryBuilder.html) is the closest fluent QOM DSL. It is stateful and not thread-safe, and its docs point to the raw QOM classes as the escape hatch, see [Query and search](https://docs.jboss.org/author/display/MODE50/Query%20and%20search.html). This plan copies the mandatory `.on()` clause and rejects the `.end()` ceremony. Oak has no public fluent builder, see the [Oak query engine](https://jackrabbit.apache.org/oak/docs/query/query-engine.html). Sling Query is a traversal DSL that Sling itself describes as slower than a JCR query, see [Sling Query vs JCR](https://sling.apache.org/documentation/bundles/sling-query/vs-jcr.html). AEM QueryBuilder is a string-keyed predicate map built for HTTP transport, see [this overview](https://medium.com/@j.abhimanyu.sahu/query-builder-api-sql2-alternatives-usage-in-aem-866e98e85daa), and this plan copies its named shorthands as facade sugar only.
- [Kysely](https://kysely.dev/docs/getting-started) is immutable and documents it loudly, and it generates its schema interface by introspection. [Drizzle](https://orm.drizzle.team/docs/overview) composes predicates as operator functions such as `and(eq(...), or(...))`. This plan copies both: immutable chaining, operator functions as the model layer, and a schema-optional generic that a CND-generated interface can narrow later. No npm package builds JCR-SQL2 or QOM, because a registry search for `jcr sql2`, `jcr qom`, `jcr query builder` and `jackrabbit query` returned unrelated packages only. GraalJS documentation on [Java interoperability](https://github.com/oracle/graaljs/blob/master/docs/user/JavaInteroperability.md) states no per-call cost figure, so section 3 measured it.
