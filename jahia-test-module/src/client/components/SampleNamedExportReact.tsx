import { useState } from "react";

/**
 * Exported by name (not by default) on purpose: islands must hydrate the same way whichever export
 * form the component uses.
 */
export function SampleNamedExportReact({ initialValue }: { initialValue: number }) {
  const [count, setCount] = useState(initialValue);

  return (
    <div>
      <p data-testid="named-export-count">Named count: {count}</p>
      <button data-testid="named-export-button" onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
