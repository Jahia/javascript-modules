import { useState } from "react";
import { add, failOnPurpose, safeDouble } from "../../actions/calculator.action";

/**
 * Exercises the client side of actions: the imports above resolve to generated fetch stubs, not
 * to the server implementation.
 */
export default function SampleGenericAction() {
  const [result, setResult] = useState("");

  return (
    <div>
      <button
        data-testid="call-add"
        onClick={async () => {
          setResult(`add:${await add(20, 22)}`);
        }}
      >
        add(20, 22)
      </button>
      <button
        data-testid="call-invalid"
        onClick={async () => {
          try {
            setResult(`unexpected:${await safeDouble({ n: -1 })}`);
          } catch (error) {
            setResult(`rejected:${(error as Error).message}`);
          }
        }}
      >
        safeDouble(-1)
      </button>
      <button
        data-testid="call-failing"
        onClick={async () => {
          try {
            await failOnPurpose();
            setResult("unexpected:no error");
          } catch (error) {
            setResult(`failed:${(error as Error).message}`);
          }
        }}
      >
        failOnPurpose()
      </button>
      <p data-testid="action-result">{result}</p>
    </div>
  );
}
