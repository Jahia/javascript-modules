import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "hydrogen:contactForm",
    componentType: "view",
    displayName: "Contact form",
  },
  ({ title, style }: { title: string; style: string }, { currentNode }) => (
    <section data-style={style}>
      <h2>{title}</h2>
      {/* posts to the hydrogenContact action declared in extensions.server.tsx */}
      <form method="post" action={buildNodeUrl(currentNode, { extension: ".hydrogenContact.do" })}>
        <label>
          Your email
          <input type="email" name="from" required />
        </label>
        <label>
          Message
          <textarea name="message" required />
        </label>
        <button type="submit">Send</button>
      </form>
    </section>
  ),
);
