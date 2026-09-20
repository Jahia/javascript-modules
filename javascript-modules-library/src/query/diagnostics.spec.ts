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

describe("the fixed environment entry", () => {
  test("a plain query reports the environment entry only", () => {
    assert.deepEqual(levels(pageQuery()), ["environment"]);
  });

  test("it always comes last, and it names the four hidden conditions", () => {
    const findings = diagnose(pageQuery());
    const last = findings[findings.length - 1];
    assert.equal(last.level, "environment");
    assert.equal(last.at, "$");
    assert.match(last.reason, /useNativeSort/);
    assert.match(last.reason, /providers/);
    assert.match(last.reason, /render mode/);
    assert.match(last.reason, /session locale/);
  });

  test("it is the only environment finding, whatever the query holds", () => {
    const model = pageQuery(qom.not(qom.comparison(title, Operator.EQUAL_TO, literal("Home"))));
    assert.deepEqual(findingsAt(model, "environment"), ["$"]);
  });
});

describe("none", () => {
  test("NAME() with LIKE and no transform fails", () => {
    const model = pageQuery(qom.comparisonSlow(qom.nodeName("p"), Operator.LIKE, literal("home%")));
    assert.deepEqual(levels(model), ["none", "environment"]);
    assert.match(diagnose(model)[0].reason, /UnsupportedRepositoryOperationException/);
  });

  test("NAME() with LIKE under a case transform does not", () => {
    const model = pageQuery(
      qom.comparisonSlow(qom.lowerCase(qom.nodeName("p")), Operator.LIKE, literal("home%")),
    );
    assert.deepEqual(levels(model), ["environment"]);
  });

  test("jcr:language compared with a bind variable fails", () => {
    const model = pageQuery(
      qom.comparison(qom.propertyValue("p", "jcr:language"), Operator.EQUAL_TO, $("lang")),
    );
    assert.deepEqual(levels(model), ["none", "environment"]);
    assert.deepEqual(findingsAt(model, "none"), ["constraint"]);
  });

  test("jcr:language compared with a literal is fine", () => {
    const model = pageQuery(
      qom.comparison(qom.propertyValue("p", "jcr:language"), Operator.EQUAL_TO, literal("en")),
    );
    assert.deepEqual(levels(model), ["environment"]);
  });

  test("a NOT around a property reports the translation rewrite", () => {
    const model = pageQuery(qom.not(qom.comparison(title, Operator.EQUAL_TO, literal("Home"))));
    assert.deepEqual(findingsAt(model, "none"), ["constraint"]);
    assert.match(diagnose(model)[0].reason, /jnt:translation/);
  });

  test("a NOT around a path constraint does not", () => {
    const model = pageQuery(qom.not(qom.descendantNode("p", "/sites/acme")));
    assert.deepEqual(levels(model), ["environment"]);
  });

  test("an UPPER around a property reports it too", () => {
    const model = pageQuery(
      qom.comparison(qom.upperCase(title), Operator.EQUAL_TO, literal("HOME")),
    );
    assert.deepEqual(findingsAt(model, "none"), ["constraint.operand1"]);
  });

  test("a LOWER around a property does not", () => {
    const model = pageQuery(
      qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(levels(model), ["environment"]);
  });
});

describe("partial", () => {
  test("a <> comparison on a property excludes multi-valued properties", () => {
    const model = pageQuery(qom.comparison(title, Operator.NOT_EQUAL_TO, literal("Home")));
    assert.deepEqual(levels(model), ["partial", "environment"]);
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
    assert.deepEqual(levels(model), ["partial", "environment"]);
    assert.deepEqual(findingsAt(model, "partial"), ["source"]);
  });
});

describe("a Slow construct carries no runtime warning, because the name is the warning", () => {
  test("a join is quiet", () => {
    const join = qom.joinSlow(
      page,
      qom.selector("jnt:content", "c"),
      JoinType.INNER,
      qom.childNodeJoinCondition("c", "p"),
    );
    assert.deepEqual(levels(qom.createQuery(join)), ["environment"]);
  });

  test("a comparison on LENGTH() or on SCORE() is quiet", () => {
    assert.deepEqual(
      levels(
        pageQuery(qom.comparisonSlow(qom.lengthSlow(title), Operator.GREATER_THAN, literal(3))),
      ),
      ["environment"],
    );
    assert.deepEqual(
      levels(
        pageQuery(
          qom.comparisonSlow(qom.fullTextSearchScore("p"), Operator.GREATER_THAN, literal(0.5)),
        ),
      ),
      ["environment"],
    );
  });

  test("NAME() and LOCALNAME() outside their index operators are quiet", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparisonSlow(qom.nodeName("p"), Operator.GREATER_THAN, literal("h")))),
      ["environment"],
    );
    assert.deepEqual(
      levels(
        pageQuery(qom.comparisonSlow(qom.nodeLocalName("p"), Operator.LESS_THAN, literal("home"))),
      ),
      ["environment"],
    );
  });

  test("NAME() with equals and LOCALNAME() with like stay on the index", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.nodeName("p"), Operator.EQUAL_TO, literal("home")))),
      ["environment"],
    );
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.nodeLocalName("p"), Operator.LIKE, literal("home%")))),
      ["environment"],
    );
  });

  test("a case transform over a property stays on the index in a comparison", () => {
    assert.deepEqual(
      levels(pageQuery(qom.comparison(qom.lowerCase(title), Operator.LIKE, literal("a%")))),
      ["environment"],
    );
  });

  test("an ordering is quiet, whether it sorts natively or in memory", () => {
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

  test("an execution without a limit is quiet", () => {
    assert.deepEqual(levels(pageQuery(), {}), ["environment"]);
    assert.deepEqual(levels(pageQuery(), { limit: -1 }), ["environment"]);
    assert.deepEqual(levels(pageQuery(), { limit: 10 }), ["environment"]);
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
    assert.deepEqual(levels(model), ["full-scan", "environment"]);
    assert.deepEqual(findingsAt(model, "full-scan"), ["columns[0]"]);
  });

  test("an exact rep:count column makes the hit loop read every document", () => {
    const model = qom.createQuery(page, null, [], [qom.column("p", "count", "rep:count()")]);
    assert.deepEqual(levels(model), ["full-scan", "environment"]);
  });

  test("rep:count with approximate=1 is bounded", () => {
    const model = qom.createQuery(
      page,
      null,
      [],
      [qom.column("p", "count", "rep:count(approximate=1)")],
    );
    assert.deepEqual(levels(model), ["environment"]);
  });

  test("an ordinary column is quiet", () => {
    const model = qom.createQuery(page, null, [], [qom.column("p"), qom.column("p", "jcr:title")]);
    assert.deepEqual(levels(model), ["environment"]);
  });
});

describe("deep-offset", () => {
  test("without execution options, it is not reported", () => {
    assert.deepEqual(levels(pageQuery()), ["environment"]);
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
      "environment",
    ]);
  });

  test("a window that fits the heap does not", () => {
    assert.deepEqual(levels(pageQuery(), { limit: 10, offset: DEEP_OFFSET_THRESHOLD - 10 }), [
      "environment",
    ]);
  });

  test("an unbounded limit does not widen the window, because unboundedSlow() is the warning", () => {
    assert.deepEqual(levels(pageQuery(), { limit: -1, offset: 0 }), ["environment"]);
    assert.deepEqual(levels(pageQuery(), { limit: -1, offset: DEEP_OFFSET_THRESHOLD + 1 }), [
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
      "partial",
      "none",
      "full-scan",
      "deep-offset",
      "environment",
    ]);
  });
});
