import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { DEEP_OFFSET_THRESHOLD, JoinType, LiteralTypes, Operator, Order } from "./constants.js";

describe("constants", () => {
  test("Operator holds the wire strings of QueryObjectModelConstants", () => {
    assert.deepEqual(Operator, {
      EQUAL_TO: "jcr.operator.equal.to",
      NOT_EQUAL_TO: "jcr.operator.not.equal.to",
      LESS_THAN: "jcr.operator.less.than",
      LESS_THAN_OR_EQUAL_TO: "jcr.operator.less.than.or.equal.to",
      GREATER_THAN: "jcr.operator.greater.than",
      GREATER_THAN_OR_EQUAL_TO: "jcr.operator.greater.than.or.equal.to",
      LIKE: "jcr.operator.like",
    });
  });

  test("JoinType holds the wire strings of QueryObjectModelConstants", () => {
    assert.deepEqual(JoinType, {
      INNER: "jcr.join.type.inner",
      LEFT_OUTER: "jcr.join.type.left.outer",
      RIGHT_OUTER: "jcr.join.type.right.outer",
    });
  });

  test("Order holds the wire strings of QueryObjectModelConstants", () => {
    assert.deepEqual(Order, {
      ASCENDING: "jcr.order.ascending",
      DESCENDING: "jcr.order.descending",
    });
  });

  test("every literal type maps to its PropertyType code and its CAST name", () => {
    assert.deepEqual(LiteralTypes, {
      String: { propertyType: 1, castName: "STRING" },
      Long: { propertyType: 3, castName: "LONG" },
      Double: { propertyType: 4, castName: "DOUBLE" },
      Date: { propertyType: 5, castName: "DATE" },
      Boolean: { propertyType: 6, castName: "BOOLEAN" },
      Name: { propertyType: 7, castName: "NAME" },
      Path: { propertyType: 8, castName: "PATH" },
      Reference: { propertyType: 9, castName: "REFERENCE" },
      WeakReference: { propertyType: 10, castName: "WEAKREFERENCE" },
      URI: { propertyType: 11, castName: "URI" },
      Decimal: { propertyType: 12, castName: "DECIMAL" },
    });
  });

  test("the literal table skips UNDEFINED and BINARY", () => {
    const codes: number[] = Object.values(LiteralTypes).map((entry) => entry.propertyType);
    assert.equal(codes.includes(0), false);
    assert.equal(codes.includes(2), false);
    assert.equal(new Set(codes).size, codes.length);
  });

  test("the deep offset threshold is the Jackrabbit heap cap", () => {
    assert.equal(DEEP_OFFSET_THRESHOLD, 32768);
  });
});
