import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { DEEP_OFFSET_THRESHOLD, JoinType, Operator } from "./constants.js";
import type { Diagnostic, DiagnosticLevel, ExecutionOptions } from "./diagnostics.js";
import { diagnose } from "./diagnostics.js";
import { qom } from "./factory.js";
import { $, literal, reference } from "./literal.js";
import type { Constraint, Ordering, QueryModel } from "./model.js";

const page = qom.selector("jnt:page", "p");
const title = qom.propertyValue("p", "jcr:title");

function pageQuery(constraint: Constraint<"p"> | null = null): QueryModel<"p"> {
  return qom.createQuery(page, constraint);
}

function orderedQuery(ordering: Ordering<"p">): QueryModel<"p"> {
  return qom.createQuery(page, null, [ordering]);
}

function levels(model: QueryModel, execution?: ExecutionOptions): DiagnosticLevel[] {
  return diagnose(model, execution).map((finding: Diagnostic) => finding.level);
}

function findingsAt(
  model: QueryModel,
  level: DiagnosticLevel,
  execution?: ExecutionOptions,
): string[] {
  return diagnose(model, execution)
    .filter((finding: Diagnostic) => finding.level === level)
    .map((finding: Diagnostic) => finding.at);
}

function innerJoin(): QueryModel<"c" | "p"> {
  return qom.createQuery(
    qom.joinSlow(
      page,
      qom.selector("jnt:content", "c"),
      JoinType.INNER,
      qom.childNodeJoinCondition("c", "p"),
    ),
  );
}

describe("a query with nothing to report", () => {
  test("it returns an empty list, so any finding is a signal", () => {
    assert.deepEqual(diagnose(pageQuery()), []);
    assert.deepEqual(diagnose(pageQuery(), { limit: 10 }), []);
    assert.deepEqual(diagnose(pageQuery(), { limit: 10, offset: 0 }), []);
    assert.deepEqual(
      diagnose(pageQuery(qom.comparison(title, Operator.EQUAL_TO, literal("Home"))), { limit: 10 }),
      [],
    );
  });
});

describe("environment", () => {
  test("an ordering raises the native sort entry", () => {
    const model = orderedQuery(qom.ascending(title));
    assert.deepEqual(findingsAt(model, "environment"), ["orderings"]);
    assert.match(diagnose(model)[0].reason, /useNativeSort/);
  });

  test("one entry covers every ordering of the query", () => {
    const model = qom.createQuery(page, null, [qom.ascending(title), qom.descending(title)]);
    assert.deepEqual(findingsAt(model, "environment"), ["orderings"]);
  });

  test("an offset raises the provider entry", () => {
    const execution = { limit: 10, offset: 20 };
    assert.deepEqual(findingsAt(pageQuery(), "environment", execution), ["execution.offset"]);
    assert.match(diagnose(pageQuery(), execution)[0].reason, /provider/);
  });

  test("a query without an ordering and without an offset raises none", () => {
    assert.deepEqual(findingsAt(pageQuery(), "environment"), []);
    assert.deepEqual(findingsAt(pageQuery(), "environment", { limit: 10, offset: 0 }), []);
  });
});

describe("none", () => {
  test("NAME() with LIKE and no transform fails", () => {
    const model = pageQuery(qom.comparisonSlow(qom.nodeName("p"), Operator.LIKE, literal("home%")));
    assert.deepEqual(levels(model), ["none"]);
    assert.match(diagnose(model)[0].reason, /UnsupportedRepositoryOperationException/);
  });

  test("NAME() with LIKE under a case transform does not", () => {
    const model = pageQuery(
      qom.comparisonSlow(qom.lowerCase(qom.nodeName("p")), Operator.LIKE, literal("home%")),
    );
    assert.deepEqual(levels(model), []);
  });

  test("jcr:language compared with a bind variable fails", () => {
    const model = pageQuery(
      qom.comparison(qom.propertyValue("p", "jcr:language"), Operator.EQUAL_TO, $("lang")),
    );
    assert.deepEqual(levels(model), ["none"]);
    assert.deepEqual(findingsAt(model, "none"), ["constraint"]);
  });

  test("jcr:language compared with a literal is fine", () => {
    const model = pageQuery(
      qom.comparison(qom.propertyValue("p", "jcr:language"), Operator.EQUAL_TO, literal("en")),
    );
    assert.deepEqual(levels(model), []);
  });

  test("a NOT around a property reports the translation rewrite, as a conditional finding", () => {
    const model = pageQuery(qom.not(qom.comparison(title, Operator.EQUAL_TO, literal("Home"))));
    assert.deepEqual(findingsAt(model, "none"), ["constraint"]);
    assert.match(diagnose(model)[0].reason, /jnt:translation/);
    assert.equal(diagnose(model)[0].conditional, true);
  });

  test("a NOT around a path constraint does not", () => {
    const model = pageQuery(qom.not(qom.descendantNode("p", "/sites/acme")));
    assert.deepEqual(levels(model), []);
  });

  test("an UPPER around a property reports it too, and it is conditional as well", () => {
    const model = pageQuery(
      qom.comparison(qom.upperCase(title), Operator.EQUAL_TO, literal("HOME")),
    );
    assert.deepEqual(findingsAt(model, "none"), ["constraint.operand1"]);
    assert.equal(diagnose(model)[0].conditional, true);
  });

  test("the two failures that need no condition are not marked conditional", () => {
    const badName = pageQuery(
      qom.comparisonSlow(qom.nodeName("p"), Operator.LIKE, literal("home%")),
    );
    const badLanguage = pageQuery(
      qom.comparison(qom.propertyValue("p", "jcr:language"), Operator.EQUAL_TO, $("lang")),
    );

    assert.equal(diagnose(badName)[0].conditional, undefined);
    assert.equal(diagnose(badLanguage)[0].conditional, undefined);
  });

  test("a LOWER around a property does not", () => {
    const model = pageQuery(
      qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(levels(model), []);
  });
});

describe("partial", () => {
  test("a <> comparison on a property excludes multi-valued properties", () => {
    const model = pageQuery(qom.comparison(title, Operator.NOT_EQUAL_TO, literal("Home")));
    assert.deepEqual(levels(model), ["partial"]);
    assert.match(diagnose(model)[0].reason, /multi-valued/);
  });

  test("nested case transforms collapse to the outer one", () => {
    const model = pageQuery(
      qom.comparison(qom.lowerCase(qom.upperCase(title)), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(findingsAt(model, "partial"), ["constraint.operand1"]);
  });

  test("a REFERENCE literal executes as a weak reference", () => {
    const model = pageQuery(
      qom.comparison(
        qom.propertyValue("p", "j:defaultCategory"),
        Operator.EQUAL_TO,
        reference("6f0c4d4e"),
      ),
    );
    assert.deepEqual(findingsAt(model, "partial"), ["constraint.operand2"]);
  });

  test("a full text search expression is inspected too", () => {
    const model = pageQuery(qom.fullTextSearch("p", null, reference("6f0c4d4e")));
    assert.deepEqual(findingsAt(model, "partial"), ["constraint.fullTextSearchExpression"]);
  });

  test("a right outer join runs as a left outer one with the sides swapped", () => {
    const rightOuter = qom.joinSlow(
      page,
      qom.selector("jnt:content", "c"),
      JoinType.RIGHT_OUTER,
      qom.childNodeJoinCondition("c", "p"),
    );
    const model = qom.createQuery(rightOuter);
    assert.deepEqual(levels(model), ["full-scan", "partial"]);
    assert.deepEqual(findingsAt(model, "partial"), ["source"]);
  });
});

describe("the two dangerous calls that used to report nothing", () => {
  test("an unbounded execution is a full scan", () => {
    assert.deepEqual(levels(pageQuery(), { limit: -1 }), ["full-scan"]);
    assert.deepEqual(findingsAt(pageQuery(), "full-scan", { limit: -1 }), ["execution.limit"]);
    assert.equal(
      diagnose(pageQuery(), { limit: -1 })[0].reason,
      "This query returns every matching node.",
    );
  });

  test("an inner join is a full scan as well", () => {
    const model = innerJoin();
    assert.deepEqual(levels(model), ["full-scan"]);
    assert.deepEqual(findingsAt(model, "full-scan"), ["source"]);
    assert.match(diagnose(model)[0].reason, /both sides/);
  });

  test("a left outer join reports it too", () => {
    const join = qom.joinSlow(
      page,
      qom.selector("jnt:content", "c"),
      JoinType.LEFT_OUTER,
      qom.childNodeJoinCondition("c", "p"),
    );
    assert.deepEqual(levels(qom.createQuery(join)), ["full-scan"]);
  });

  test("a join of a join reports one finding per join", () => {
    const outer = qom.joinSlow(
      innerJoin().source,
      qom.selector("jnt:file", "f"),
      JoinType.INNER,
      qom.childNodeJoinCondition("f", "p"),
    );
    assert.deepEqual(findingsAt(qom.createQuery(outer), "full-scan"), ["source", "source.left"]);
  });
});

describe("a Slow construct whose cost the name already carries stays quiet", () => {
  test("a comparison on LENGTH() or on SCORE() is quiet", () => {
    assert.deepEqual(
      levels(
        pageQuery(qom.comparisonSlow(qom.lengthSlow(title), Operator.GREATER_THAN, literal(3))),
      ),
      [],
    );
    assert.deepEqual(
      levels(
        pageQuery(
          qom.comparisonSlow(qom.fullTextSearchScore("p"), Operator.GREATER_THAN, literal(0.5)),
        ),
      ),
      [],
    );
  });

  test("NAME() and LOCALNAME() outside their index operators are quiet", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparisonSlow(qom.nodeName("p"), Operator.GREATER_THAN, literal("h")))),
      [],
    );
    assert.deepEqual(
      levels(
        pageQuery(qom.comparisonSlow(qom.nodeLocalName("p"), Operator.LESS_THAN, literal("home"))),
      ),
      [],
    );
  });

  test("NAME() with equals and LOCALNAME() with like stay on the index", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.nodeName("p"), Operator.EQUAL_TO, literal("home")))),
      [],
    );
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.nodeLocalName("p"), Operator.LIKE, literal("home%")))),
      [],
    );
  });

  test("a case transform over a property stays on the index in a comparison", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.lowerCase(title), Operator.LIKE, literal("a%")))),
      [],
    );
  });

  test("an ordering carries the native sort entry and nothing more", () => {
    assert.deepEqual(levels(orderedQuery(qom.ascending(title))), ["environment"]);
    assert.deepEqual(levels(orderedQuery(qom.descending(qom.fullTextSearchScore("p")))), [
      "environment",
    ]);
    assert.deepEqual(levels(orderedQuery(qom.ascendingSlow(qom.lowerCase(title)))), [
      "environment",
    ]);
    assert.deepEqual(levels(orderedQuery(qom.descendingSlow(qom.lengthSlow(title)))), [
      "environment",
    ]);
  });

  test("an execution with a limit, and one with no options at all, are quiet", () => {
    assert.deepEqual(levels(pageQuery(), {}), []);
    assert.deepEqual(levels(pageQuery(), { limit: 10 }), []);
  });
});

describe("full-scan", () => {
  test("a rep:facet column makes the hit loop read every document", () => {
    const model = qom.createQuery(
      page,
      null,
      [],
      [qom.column("p", "j:tags", "rep:facet(key=j:tags)")],
    );
    assert.deepEqual(levels(model), ["full-scan"]);
    assert.deepEqual(findingsAt(model, "full-scan"), ["columns[0]"]);
  });

  test("an exact rep:count column makes the hit loop read every document", () => {
    const model = qom.createQuery(page, null, [], [qom.column("p", "count", "rep:count()")]);
    assert.deepEqual(levels(model), ["full-scan"]);
  });

  test("rep:count with approximate=1 is bounded", () => {
    const model = qom.createQuery(
      page,
      null,
      [],
      [qom.column("p", "count", "rep:count(approximate=1)")],
    );
    assert.deepEqual(levels(model), []);
  });

  test("an ordinary column is quiet", () => {
    const model = qom.createQuery(page, null, [], [qom.column("p"), qom.column("p", "jcr:title")]);
    assert.deepEqual(levels(model), []);
  });
});

describe("deep-offset", () => {
  test("without execution options, it is not reported", () => {
    assert.deepEqual(levels(pageQuery()), []);
  });

  test("an offset past the heap cap reports deep-offset", () => {
    assert.deepEqual(levels(pageQuery(), { limit: 10, offset: DEEP_OFFSET_THRESHOLD + 1 }), [
      "deep-offset",
      "environment",
    ]);
    assert.deepEqual(
      findingsAt(pageQuery(), "deep-offset", { offset: DEEP_OFFSET_THRESHOLD + 1 }),
      ["execution"],
    );
  });

  test("a window past the heap cap reports deep-offset, even with a small offset", () => {
    assert.deepEqual(levels(pageQuery(), { limit: 100, offset: DEEP_OFFSET_THRESHOLD }), [
      "deep-offset",
      "environment",
    ]);
    assert.deepEqual(levels(pageQuery(), { limit: DEEP_OFFSET_THRESHOLD + 1, offset: 0 }), [
      "deep-offset",
    ]);
  });

  test("a window that fits the heap does not", () => {
    assert.deepEqual(levels(pageQuery(), { limit: 10, offset: DEEP_OFFSET_THRESHOLD - 10 }), [
      "environment",
    ]);
  });

  test("an unbounded limit does not widen the window", () => {
    assert.deepEqual(levels(pageQuery(), { limit: -1, offset: 0 }), ["full-scan"]);
    assert.deepEqual(levels(pageQuery(), { limit: -1, offset: DEEP_OFFSET_THRESHOLD + 1 }), [
      "full-scan",
      "deep-offset",
      "environment",
    ]);
  });
});

describe("a query that trips several levels at once", () => {
  test("every finding is reported, in model order", () => {
    const join = qom.joinSlow(
      page,
      qom.selector("jnt:content", "c"),
      JoinType.RIGHT_OUTER,
      qom.childNodeJoinCondition("c", "p"),
    );
    const model = qom.createQuery(
      join,
      qom.not(qom.comparison(title, Operator.EQUAL_TO, literal("Home"))),
      [qom.ascendingSlow(qom.lowerCase(title))],
      [qom.column("p", "count", "rep:count()")],
    );

    assert.deepEqual(levels(model, { offset: 100_000 }), [
      "full-scan",
      "partial",
      "none",
      "environment",
      "full-scan",
      "deep-offset",
      "environment",
    ]);
  });
});
