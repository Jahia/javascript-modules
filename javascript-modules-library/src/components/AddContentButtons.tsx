import type { JSX } from "react";
import server from "virtual:jahia-server";
import { useServerContext } from "../hooks/useServerContext.js";

/**
 * React best practices: use a variable instead of an expression so that React can optimize the
 * rendering safely.
 *
 * This is because `[] !== []` in JavaScript (arrays are compared by reference), so React might
 * re-render the component.
 *
 * @see {@link https://eslint-react.xyz/docs/rules/no-unstable-default-props}
 */
const defaultNodeTypes: string[] = [];

/**
 * Generates add content buttons for a content object
 *
 * @returns The add content buttons.
 */
export function AddContentButtons(
  props: Readonly<{
    /** The node types to add. */
    nodeTypes?: string[];
    /**
     * The child name.
     *
     * @default *
     */
    childName?: string;
    /**
     * If true, the edit check will be performed.
     *
     * @default false
     */
    editCheck?: boolean;
  }>,
): JSX.Element;

export function AddContentButtons({
  nodeTypes = defaultNodeTypes,
  childName = "*",
  editCheck = false,
}: Readonly<{
  nodeTypes?: string[]; // string is deprecated
  childName?: string;
  editCheck?: boolean;
}>): JSX.Element {
  const { renderContext, currentResource } = useServerContext();
  return (
    // @ts-expect-error <unwanteddiv> is not a valid HTML element
    <unwanteddiv
      dangerouslySetInnerHTML={{
        __html: server.render.createContentButtons(
          childName,
          // The render produces a ModuleTag instance under the hood
          // (<template:module nodeTypes="type1 type2 type3" /> in JSP),
          // it expects a string with the node types separated by a space.
          nodeTypes.join(" "),
          editCheck,
          renderContext,
          currentResource,
        ),
      }}
    />
  );
}
