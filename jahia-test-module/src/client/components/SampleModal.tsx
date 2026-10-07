import type { ReactNode } from "react";

export default function SampleModal({ children }: { children: ReactNode }) {
  return (
    <dialog open data-testid="modal">
      {children}
    </dialog>
  );
}
