# Bind the query builder to the JCR query object model

- Status: accepted
- Date: 2026-09-20

## Context and problem statement

A JavaScript module reads content from the JCR by passing a JCR SQL2 statement to the library. The statement is a string, so every value a module puts in it is concatenated by hand. A quote in a title breaks the query, and a value that comes from a request is an injection. Nothing checks a node type, a property name or a path before the query reaches the repository. Nothing bounds the query either. The existing entry points accept a query with no limit, and such a query reads every node it matches.

A typed builder removes the string from the module author's hands. The question this record answers is what such a builder should produce, and where the result should enter Jahia.

## Decision drivers

- A module author should get good performance by default, without knowing how Jackrabbit executes a query.
- A value that a module puts in a query must be carried as a value, never as text spliced into a statement.
- The builder should cover the query language of the JCR specification, and it should name the constructs that Jahia's Jackrabbit executes differently.
- A query should be testable without a running repository.

## Considered options

1. Generate a JCR SQL2 statement in TypeScript and pass it to the existing entry point.
2. Build a `javax.jcr.query.qom.QueryObjectModel` through the session's query object model factory, and execute that object.
3. Implement the `javax.jcr.query.qom` interfaces in JavaScript and hand those objects to Jahia.

## Decision outcome

Chosen option: build a `QueryObjectModel` through the session's factory.

The query object model is the lower level of the two public forms. A JCR SQL2 statement is parsed into a query object model before anything else happens. The Lucene translation then consumes that model, and no API sits below the model. Both forms therefore reach the same executable object, and a measurement of the two paths showed no difference. The object model path adds no step, and it removes the step where a string can be malformed.

The builder is split into a pure layer and a host layer. The pure layer holds an immutable, JSON serializable model, one constructor per interface of the specification, and a fluent facade over them. The host layer walks that model once and calls the factory of the session, one call per node, then executes the resulting object. The pure layer runs in Node without a JVM, so the model, its validation and its diagnostics are unit tested. A query can also be logged or cached before it runs.

Option 3 was rejected, because Jahia's query service casts the object model it receives to the Jackrabbit implementation classes. A JavaScript object that only implements the interfaces is therefore refused.

Option 1 was rejected as the default path. A statement generator is a second implementation of the formatter rules of the Jackrabbit fork. That second implementation has to be kept in step with the fork, and it gains no fidelity. The option stays available as a later addition, for a consumer that can only take a string, such as the GraphQL query entry point. The correctness of a generated statement will be checked against the statement that the repository formats from the same model.

### Consequences

- The builder is server only. The factory and the value factory are host objects, so the sink cannot run in a browser. A client side consumer needs the statement generator, so that option is kept.
- The only text form of a built query is the statement that the repository formats from the model. The library logs that statement at debug level, and the integration tests assert it. A module author reads the query they wrote.
- A bind variable cannot be bound on this path, because the proxy Jahia returns from the factory does not carry the binding to execution. The builder therefore keeps bind variables in the model for coverage, and replaces each one with a typed literal before the first host call. A variable with no value is refused before the query reaches Jahia.
- A literal is created through the value factory with an explicit property type. Jahia's value factory converts a reference literal into a weak reference. A query that compares a strong reference property therefore behaves as if the property were weak. The diagnostics report this conversion, and the documentation states it.
- A query with no explicit columns emits one wildcard column per selector, which is what the parser produces for a statement that selects everything. The internationalization rewrite then sees the same shape on both paths.

## How the API carries the cost of a query

Jackrabbit serves most constraints from the Lucene index, and it evaluates the rest in memory, one node load per matching hit. The in-memory group is slower by orders of magnitude, and its cost grows with the repository. Both groups are written the same way in a statement, so a module author cannot see the difference where the query is written.

Every function that produces a construct of the in-memory group carries the suffix `Slow` in its name. The suffix appears in the constructor layer and in the facade. The constructs are joins, string length, comparisons on the relevance score, and comparisons on a node name outside the operators the index serves. An ordering on anything other than a property or the relevance score is in the same group, and so is an execution with no limit. The facade splits its filter and ordering methods, so a slow construct only compiles through a method whose name carries the suffix. The name carries the warning, and the library adds no runtime warning.

A query is not executable until a limit is set, and the type system enforces that rule. The entry points accept only a builder whose limit was set. The escape hatch for an unbounded query is a method that carries the suffix too. The limit and the offset travel next to the model rather than inside it. One built query therefore serves several pages, and no layer slices the result in JavaScript.

Four conditions outside a query change how that query executes. The conditions are the native sort setting of Jackrabbit, the mounted JCR providers, the active render mode and the locale of the session. A diagnostics function reports these four conditions, next to the findings it derives from the model itself. A derived finding names a construct that fails at execution, or a construct that runs with different semantics. A derived finding also names an offset deep enough to make the search run again, and a column that forces a full scan.

A query whose diagnostics report a failure is refused before it reaches Jahia. The exception is a failure that needs one of the conditions the model cannot see. Such a finding is reported and the query runs, because refusing every such query would take a whole construct away from every caller.

## Pros and cons of the options

### Generate a JCR SQL2 statement

- Good, because the output runs on every JCR entry point, including the ones that take a string.
- Good, because the output is readable and easy to log.
- Bad, because it duplicates the formatting rules of the Jackrabbit fork, which must then be kept in step with it.
- Bad, because the statement is parsed back into a query object model before it executes, so the string is a detour.

### Build a query object model through the factory

- Good, because it is the form the repository executes, so nothing is formatted and nothing is parsed.
- Good, because every value is created through the value factory with its property type, so no value is ever text in a statement.
- Bad, because it is server only.
- Bad, because the model must be walked node by node into host calls, which is code the string form does not need.

### Implement the specification interfaces in JavaScript

- Good, because it would need no walk at all.
- Bad, because Jahia's query service casts the object model to the implementation classes of the provider, so such objects are refused.
