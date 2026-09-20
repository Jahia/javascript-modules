// Rendering components
export { Island } from "./components/render/Island.js";
export { Render, type VirtualJCRNode } from "./components/render/Render.js";
export { RenderChild } from "./components/render/RenderChild.js";
export { RenderChildren } from "./components/render/RenderChildren.js";

// Components
export { AbsoluteArea } from "./components/AbsoluteArea.js";
export { AddContentButtons } from "./components/AddContentButtons.js";
export { AddResources } from "./components/AddResources.js";
export { Area } from "./components/Area.js";
export { JImage } from "./components/JImage.js";

// Declaration and registration
export { jahiaComponent, type RegistryJahiaComponent } from "./framework/jahiaComponent.js";

// Hooks
export { useGQLQuery } from "./hooks/useGQLQuery.js";
export { useJCRQuery } from "./hooks/useJCRQuery.js";
export { useServerContext, ServerContextProvider } from "./hooks/useServerContext.js";

// JCR utils
export { getChildNodes } from "./utils/jcr/getChildNodes.js";
export { getNodeProps } from "./utils/jcr/getNodeProps.js";
export { getNodesByJCRQuery } from "./utils/jcr/getNodesByJCRQuery.js";

// Query builder
export {
  $,
  and,
  date,
  decimal,
  diagnose,
  double,
  from,
  JoinType,
  literal,
  long,
  name,
  not,
  Operator,
  or,
  Order,
  path,
  qom,
  QueryError,
  reference,
  unchecked,
  uri,
  weakReference,
} from "./query/index.js";
export type {
  And,
  Arg,
  BindVariableValue,
  Bindings,
  Bound,
  CaseRef,
  ChildNode,
  ChildNodeJoinCondition,
  Column,
  Comparison,
  Constraint,
  DescendantNode,
  DescendantNodeJoinCondition,
  Diagnostic,
  DiagnosticLevel,
  DynamicOperand,
  EquiJoinCondition,
  Executable,
  ExecutionOptions,
  FastOperand,
  FullTextSearch,
  FullTextSearchScore,
  Join,
  JoinClause,
  JoinCondition,
  Length,
  LengthRef,
  Literal,
  LiteralArg,
  LiteralType,
  LiteralValue,
  LocalNameRef,
  LowerCase,
  NameRef,
  NodeLocalName,
  NodeName,
  Not,
  Operand,
  Or,
  Ordering,
  PropertyExistence,
  PropertyRef,
  PropertyValue,
  Queryable,
  QueryBuilder,
  QueryErrorCode,
  QueryModel,
  Refs,
  RefShape,
  SameNode,
  SameNodeJoinCondition,
  ScoreRef,
  Selector,
  SelectorRef,
  Selectors,
  Source,
  Speed,
  StaticOperand,
  UpperCase,
} from "./query/index.js";
// The object model sink. A module rarely needs it, because both seams call it, but it is the only
// way to read the JCR-SQL2 statement Jahia formats for a built query.
export { toQOM } from "./query/qom.js";

// URL builder
export {
  buildEndpointUrl,
  buildNodeUrl,
  buildModuleFileUrl,
} from "./utils/urlBuilder/urlBuilder.js";
export { getImageProps } from "./utils/image/getImageProps.js";
export type { ImageProps } from "./utils/image/getImageProps.js";

// I18n
export { getSiteLocales } from "./utils/i18n.js";

// Re-export Java helpers
// `server` is a global variable, but it is less surprising to be able to import it from the library
// ...and removing it would be a breaking change...
// We need the intermediate variable because only local vars can be exported
const localServer = server;
export { localServer as server };
