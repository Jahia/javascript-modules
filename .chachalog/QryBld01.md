---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Modules can build JCR queries with a typed builder instead of concatenating JCR-SQL2 strings. (#796)

The builder mirrors `javax.jcr.query.qom.QueryObjectModel`, which is the level Jahia hands to its Lucene translation. Constructs that the query engine evaluates in memory, such as joins and `LENGTH`, carry a `Slow` suffix, so the cost of a query is visible where it is written.
