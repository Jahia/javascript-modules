---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/node-validators
  jcr:title: Server-Side Node Validators
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Node validators run on the server every time a JCR session saves a node of a given type. Returning violations rejects the save and surfaces error messages in Content Editor — attached to a specific field or to the whole node. With JavaScript modules you can declare validators in JavaScript, without writing a Java module.

## Declaring a validator

Call `registerNodeValidator` at the top level of a server file (it registers the validator as a side effect at module startup, like `jahiaComponent`):

```ts
import { registerNodeValidator } from "@jahia/javascript-modules-library";

registerNodeValidator({ nodeType: "mymodule:article" }, (node) => {
  const email = node.getPropertyAsString("email");
  if (email && !email.includes("@")) {
    return { message: "Please provide a valid email address", propertyName: "email" };
  }
});
```

The callback receives the `JCRNodeWrapper` being saved and returns:

- **nothing** — the node is valid,
- **one violation** or **an array of violations** — the save is rejected.

A violation is `{ message, propertyName? }`: with `propertyName`, the message is shown on that field in Content Editor; without it, it is shown as a node-level error.

## Declaration options

| Option         | Description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `nodeType`     | Node type (primary or mixin) the validator applies to, matched with `isNodeType()`.                       |
| `name`         | Distinguishes several validators on the same node type in one module. Default `"default"`.                |
| `skipOnImport` | Skip this validator during content imports. Default `false`.                                              |
| `advanced`     | Run in the advanced phase, which only runs once **all** default-phase validators passed. Default `false`. |

The two phases mirror Jahia's Java validator groups: default-phase violations suppress the advanced phase entirely (advanced checks can assume basic integrity).

## Localizing messages

Messages of the form `{my.bundle.key}` (the whole message being a single `{…}` reference) are resolved by Jahia against the deployed resource bundles, in the editor's UI locale — the same mechanism Java validators use. Ship the keys in your module's `settings/resources/*.properties` bundles:

```ts
return { message: "{mymodule.validation.email.invalid}", propertyName: "email" };
```

Any other message is displayed verbatim. Alternatively, resolve the text yourself in the callback using `context.locale` (the saving session's locale as a BCP-47 tag, possibly null).

## Good to know

- **Never call `session.save()` inside a validator** — it would recurse into validation.
- **Keep validators fast**: they run on every matching session save (editing, APIs, publication-driven saves). They may be `async`, limited to microtask-based work (the server runtime has no timers or async I/O).
- **i18n properties**: Jahia silently drops violations attached to internationalized properties when the saving session has no locale; return a node-level violation as a fallback if that matters for your check.
- **Failure policy**: a validator that throws fails the save with a generic node-level message (fail closed) and logs the error with the validator key; a returned violation without a string `message` is logged and ignored.
- **GraphQL/API saves** are validated too — the violation messages appear in the mutation errors.
