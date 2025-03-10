import { useState } from "react";

export default function SampleHydrateInBrowserReact({ initialValue, set, children }) {
  const [count, setCount] = useState(initialValue);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h2>This React component is hydrated client side:</h2>
      <p data-testid="count">Count: {count}</p>
      <button data-testid="count-button" onClick={handleClick}>
        Increment
      </button>
      <p data-testid="set">Set: {[...set].join(", ")}</p>
      {children}
    </div>
  );
}
