import { useState, type ReactNode } from "react";

export default function SampleClientOnlyChildren({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div data-testid="client-only-children">
      <button type="button" data-testid="client-only-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Hide" : "Show"} children
      </button>
      {isOpen && children}
    </div>
  );
}
