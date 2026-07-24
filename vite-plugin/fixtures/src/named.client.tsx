/** A client component exported by name, to check named exports carry hydration metadata. */
export function Named() {
  return <pre>Named export!</pre>;
}

/** A second named export in the same file, tagged independently. */
export const AlsoNamed = () => <pre>Also a named export!</pre>;
