import { useState } from "react";

export default function () {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Click me: {count}
    </button>
  );
}
