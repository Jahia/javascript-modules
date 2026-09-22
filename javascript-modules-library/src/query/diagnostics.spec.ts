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

/**
 * The full text expression is the one free text the model carries, and the JCR parser reads it
 * inside `execute()`, after the statement is formatted and the limit is set. Nothing later in the
 * path can report the failure, so these rules report it here.
 *
 * Every expression in the two lists below was run against Jahia 8.2.3.2 through the GraphQL
 * `nodesByCriteria` endpoint, whose `contains` reaches this same parser. The batch carried a
 * positive control that returned rows, so its empty results mean an empty result and not a broken
 * index. The first list holds the expressions that answered `javax.jcr.RepositoryException: Invalid
 * full text search expression`, the second holds the expressions that ran. Nothing here is derived
 * from the grammar: the grammar over-reports, and the pairs that look alike and behave differently
 * are exactly what these two lists pin.
 */
describe("a full text expression", () => {
  const search = (expression: string): QueryModel<"p"> =>
    pageQuery(qom.fullTextSearch("p", null, literal(expression)));

  test("a shape the parser rejects is reported as a query that does not run", () => {
    // `""` and `"   "` are the empty expression, with and without whitespace. Every other one threw
    // on 8.2.3.2. Read each against its neighbour in the accepted list: `home -` against `home-`,
    // `home!` against `home!page`, `&&` against `&&&`, `OR` against `AND`. `OR home`, `&& home` and
    // `|| home` are the binary operators missing their left term, where `-policy` shows that a
    // prefix operator opens a legal expression. The three that end on a space are here because a
    // trailing space rescues a dangling `+`, `-` or `!` and does not rescue a binary operator, so
    // `&& `, `home && ` and `home OR ` still threw. `+ -` and `! -` end on a raw `-`, which the
    // space before it does not reach.
    for (const expression of [
      "privacy!",
      "foo(",
      '"unclosed',
      "OR",
      "--",
      "",
      "   ",
      "a)b",
      "(home",
      "home)",
      '"a" "b" (c',
      "home -",
      "home +",
      "home !",
      "home!",
      "home --",
      "home OR",
      "home &&",
      "home ||",
      "(home)!",
      "home*!",
      "&&",
      "||",
      "+",
      "-",
      "!",
      "OR home",
      "&& home",
      "|| home",
      "&& ",
      "home && ",
      "home OR ",
      "+ -",
      "! -",
    ]) {
      assert.deepEqual(levels(search(expression)), ["none"], `${expression} must be reported`);
      assert.deepEqual(findingsAt(search(expression), "none"), [
        "constraint.fullTextSearchExpression",
      ]);
    }
  });

  test("a shape the parser accepts is not reported, wildcards and operators included", () => {
    // The assertion is that no rule fires, and not that rows come back: `-policy` was measured and
    // returned none, which is a result and not a rejection. Every one of these ran on 8.2.3.2, so
    // every one of them is a query a rule must not refuse. `term\!` and `home \!` are the escaped
    // forms of `privacy!`, and they ran; `"a (b" home` holds a parenthesis inside a phrase, and it
    // ran; `C++` and `home-` end on an operator character glued to a term, and both ran.
    // `\-home OR page` opens on an escaped operator, which is a term, so the `OR` that follows it
    // is not the leading operator of the expression: it ran and returned rows. `\OR home` and
    // `home \OR` are the same point on the operator word itself, and both ran, as did `\OR` and
    // `\&&` on their own, which are the escaped forms of two expressions that fail unescaped.
    //
    // The expressions that carry a space around an operator are the other half of that rule, and
    // the half a search box meets. The parser escapes a `+`, a `-` or a `!` into ordinary text as soon as whitespace
    // follows it, so `home!` fails while `home! ` runs, `home -` fails while `home - ` runs, `--`
    // fails while `-- ` runs, and a `-` or a `!` between two terms was text all along.
    for (const expression of [
      "graal*",
      '"exact phrase"',
      "chateaux OR policy",
      "a AND b",
      "a NOT b",
      "AND",
      "NOT",
      "-policy",
      "*hateau*",
      "seat*",
      "(a OR b) c",
      "(home)",
      '"a (b" home',
      '"a )b"',
      '"home (page"',
      '"home!"',
      '"home -"',
      "term\\",
      "term\\!",
      "\\-home OR page",
      "\\OR home",
      "home \\OR",
      "\\OR",
      "\\&&",
      "term\\(",
      "term\\\\",
      "home \\!",
      "\\-",
      "C++",
      "home-",
      "home+",
      "home!page",
      "home &",
      "home |",
      "&",
      "|",
      "&&&",
      "-&",
      "home ~",
      "50",
      "home! ",
      "home ! ",
      "home - ",
      "home + ",
      "-- ",
      "-!  ",
      "+ ",
      "- ",
      "! ",
      "- home",
      "+ home",
      "! home",
      "home ! page",
      "home -- page",
      "home*! ",
      "(home)! ",
    ]) {
      assert.deepEqual(levels(search(expression)), [], `${expression} must be accepted`);
    }
  });

  test("the rule that fires names the operator, so the message points at the fix", () => {
    // `--` and `home -` fail for the same reason, and a developer needs to read two different
    // sentences: the first has nothing left to search for, and the second lost only its right
    // operand. Asserting the level alone would let one rule stand in for the other.
    assert.match(diagnose(search("--"))[0].reason, /holds no term to search for/);
    assert.match(diagnose(search("home -"))[0].reason, /ends on the operator -/);
    assert.match(diagnose(search("home!"))[0].reason, /ends on the operator !/);
    assert.match(diagnose(search("home OR"))[0].reason, /ends on the operator OR/);
    assert.match(diagnose(search("OR home"))[0].reason, /opens on the operator OR/);
    assert.match(diagnose(search("foo("))[0].reason, /unbalanced parenthesis/);
    assert.match(diagnose(search('"unclosed'))[0].reason, /unclosed quotation mark/);
  });

  test("a percent sign is the wildcard of the other alphabet, and is reported as partial", () => {
    // A `%` is an ordinary character in the expression: the analyser splits the term at it, so
    // `%priv%` searches for `priv`, and a term carrying a `*` skips the analyser, so the `%` stays
    // in `%priv*%` and it matches nothing. Neither one fails the query, so neither is refused.
    // `%privacy!%` returned rows where `privacy!` failed, so the wrapper is a working escape and
    // carries this finding alone.
    assert.deepEqual(levels(search("%priv%")), ["partial"]);
    assert.deepEqual(levels(search("%priv*%")), ["partial"]);
    assert.deepEqual(levels(search("%privacy!%")), ["partial"]);
    assert.deepEqual(findingsAt(search("%priv%"), "partial"), [
      "constraint.fullTextSearchExpression",
    ]);
  });

  test("an expression supplied at execution time is not read", () => {
    assert.deepEqual(levels(pageQuery(qom.fullTextSearch("p", null, $("words")))), []);
  });

  test("the rules reach a search nested under the other constraints", () => {
    const model = pageQuery(
      qom.or(
        qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
        qom.fullTextSearch("p", "jcr:title", literal("privacy!")),
      ),
    );
    assert.deepEqual(findingsAt(model, "none"), [
      "constraint.constraint2.fullTextSearchExpression",
    ]);
  });
});
