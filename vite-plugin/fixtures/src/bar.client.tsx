import { useState } from "react";
import { greet, sum } from "./greet.action";

export default function Bar() {
  const [message, setMessage] = useState("");

  return (
    <button
      onClick={async () => {
        // calls cross the network: greet.action.ts is compiled to fetch stubs on the client
        setMessage(`${await greet("world")} (${await sum(1, 2, 3)})`);
      }}
    >
      {message || "Say hello"}
    </button>
  );
}
