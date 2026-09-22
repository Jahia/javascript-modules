import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { JoinType, Operator } from "./constants.js";
import { qom } from "./factory.js";
import { literal } from "./literal.js";
import type { QueryModel } from "./model.js";
import {
  QueryError,
  declaredSelectors,
  isValidColumnPart,
  isValidLocalName,
  isValidName,
  isValidPath,
  selectorReferences,
  validateModel,
  validateSelectorReferences,
  validateSourceSelectors,
} from "./validate.js";

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error.code : `not a QueryError: ${String(error)}`;
  }
}

function errorAt(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error.at : undefined;
  }
}

describe("the JCR name grammar", () => {
  test("it takes a simple name and a prefixed name", () => {
    assert.equal(isValidName("title"), true);
    assert.equal(isValidName("jcr:title"), true);
    assert.equal(isValidName("j:defaultCategory"), true);
    assert.equal(isValidLocalName("title"), true);
  });

  test("it rejects the five reserved characters", () => {
    for (const value of ["a/b", "a[b", "a]b", "a|b", "a*b"]) {
      assert.equal(isValidName(value), false, value);
    }
  });

  test("it rejects an empty name, a self or parent name and stray whitespace", () => {
    assert.equal(isValidName(""), false);
    assert.equal(isValidName("."), false);
    assert.equal(isValidName(".."), false);
    assert.equal(isValidName(" title"), false);
    assert.equal(isValidName("title "), false);
    assert.equal(isValidName("a\tb"), false);
  });

  test("it rejects a second colon and a prefix that is not an NCName", () => {
    assert.equal(isValidName("rep:facet(nodetype=jnt:news)"), false);
    assert.equal(isValidName("1ns:title"), false);
    assert.equal(isValidName(":title"), false);
  });

  test("a name may hold a space in the middle", () => {
    assert.equal(isValidName("my title"), true);
  });
});

describe("the JCR path grammar", () => {
  test("it takes the root, an absolute path and a relative path", () => {
    assert.equal(isValidPath("/"), true);
    assert.equal(isValidPath("/sites/acme/contents"), true);
    assert.equal(isValidPath("."), true);
    assert.equal(isValidPath(".."), true);
    assert.equal(isValidPath("child/grandchild"), true);
  });

  test("it takes a same-name sibling index", () => {
    assert.equal(isValidPath("/sites/acme/list[2]"), true);
    assert.equal(isValidPath("/sites/acme/list[]"), false);
    assert.equal(isValidPath("/sites/acme/list[a]"), false);
  });

  test("it rejects an empty segment and an empty path", () => {
    assert.equal(isValidPath(""), false);
    assert.equal(isValidPath("/sites//acme"), false);
    assert.equal(isValidPath("/sites/"), false);
  });
});

describe("the looser column grammar", () => {
  test("it keeps the Jahia extensions expressible", () => {
    assert.equal(isValidColumnPart("rep:facet(nodetype=jnt:news&key=j:tags)"), true);
    assert.equal(isValidColumnPart("rep:count(approximate=1)"), true);
    assert.equal(isValidColumnPart("rep:filter("), true);
    assert.equal(isValidColumnPart("jcr:score"), true);
  });

  test("it still rejects a closing bracket, an empty part and stray whitespace", () => {
    assert.equal(isValidColumnPart("rep:facet[1]"), false);
    assert.equal(isValidColumnPart(""), false);
    assert.equal(isValidColumnPart(" alias"), false);
  });
});

describe("selectors across a source", () => {
  const page = qom.selector("jnt:page", "p");
  const content = qom.selector("jnt:content", "c");

  test("declaredSelectors walks a join in tree order", () => {
    const join = qom.joinSlow(page, content, JoinType.INNER, qom.childNodeJoinCondition("c", "p"));
    assert.deepEqual(declaredSelectors(join), ["p", "c"]);
    assert.deepEqual(declaredSelectors(page), ["p"]);
  });

  test("two sides that share an alias throw DUPLICATE_SELECTOR", () => {
    const join = qom.joinSlow(
      page,
      qom.selector("jnt:content", "p"),
      JoinType.INNER,
      qom.childNodeJoinCondition("p", "p"),
    );
    assert.equal(
      errorCode(() => validateSourceSelectors(join)),
      "DUPLICATE_SELECTOR",
    );
    assert.equal(
      errorAt(() => validateSourceSelectors(join)),
      "source.right",
    );
  });

  test("a join without a condition throws MISSING_JOIN_CONDITION", () => {
    const join = {
      kind: "Join",
      left: page,
      right: content,
      joinType: JoinType.INNER,
    } as unknown as QueryModel["source"];
    assert.equal(
      errorCode(() => validateSourceSelectors(join)),
      "MISSING_JOIN_CONDITION",
    );
  });

  test("a node of an unknown kind throws UNSUPPORTED", () => {
    const source = { kind: "Whatever" } as unknown as QueryModel["source"];
    assert.equal(
      errorCode(() => declaredSelectors(source)),
      "UNSUPPORTED",
    );
  });
});

describe("selector references", () => {
  const source = qom.joinSlow(
    qom.selector("jnt:page", "p"),
    qom.selector("jnt:content", "c"),
    JoinType.INNER,
    qom.childNodeJoinCondition("c", "p"),
  );

  test("they are collected from the join condition, the constraint, the orderings and the columns", () => {
    const model = qom.createQuery(
      source,
      qom.and(
        qom.comparison(qom.propertyValue("c", "jcr:title"), Operator.EQUAL_TO, literal("Home")),
        qom.not(qom.propertyExistence("p", "j:published")),
      ),
      [qom.ascendingSlow(qom.lengthSlow(qom.propertyValue("p", "jcr:title")))],
      [qom.column("c", "jcr:title", "childTitle")],
    );

    assert.deepEqual(
      selectorReferences(model).map((reference) => `${reference.name}@${reference.at}`),
      [
        "c@source.joinCondition",
        "p@source.joinCondition",
        "c@constraint.constraint1.operand1",
        "p@constraint.constraint2.constraint",
        "p@orderings[0].operand.propertyValue",
        "c@columns[0]",
      ],
    );
  });

  test("an undeclared selector throws UNDECLARED_SELECTOR with its path", () => {
    const model: QueryModel = {
      kind: "QueryObjectModel",
      source: qom.selector("jnt:page", "p"),
      constraint: qom.comparison(
        qom.propertyValue("q", "jcr:title"),
        Operator.EQUAL_TO,
        literal("Home"),
      ),
      orderings: [],
      columns: [],
    };

    assert.equal(
      errorCode(() => validateSelectorReferences(model)),
      "UNDECLARED_SELECTOR",
    );
    assert.equal(
      errorAt(() => validateSelectorReferences(model)),
      "constraint.operand1",
    );
  });

  test("an undeclared column selector is caught too", () => {
    const model: QueryModel = {
      kind: "QueryObjectModel",
      source: qom.selector("jnt:page", "p"),
      constraint: null,
      orderings: [],
      columns: [qom.column("q", "jcr:title")],
    };

    assert.equal(
      errorAt(() => validateModel(model)),
      "columns[0]",
    );
  });

  test("a valid model passes every check", () => {
    const model = qom.createQuery(qom.selector("jnt:page", "p"));
    assert.equal(validateModel(model), undefined);
  });
});
