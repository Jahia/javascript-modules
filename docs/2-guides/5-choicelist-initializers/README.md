---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/choicelist-initializers
  jcr:title: Declaring Choicelist Initializers
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Choicelist initializers populate the dropdown lists offered to editors in Content Editor. Out of the box, Jahia provides initializers such as `resourceBundle` or `nodes`; with JavaScript modules you can declare your own initializers in JavaScript, without writing a Java module.

## Declaring an initializer

Call `registerChoiceListInitializer` at the top level of a server file (it registers the initializer as a side effect at module startup, like `jahiaComponent`):

```ts
import { registerChoiceListInitializer } from "@jahia/javascript-modules-library";

registerChoiceListInitializer({ key: "myModuleColors" }, ({ locale }) => [
  { label: locale.startsWith("fr") ? "Rouge" : "Red", value: "red" },
  { label: locale.startsWith("fr") ? "Vert" : "Green", value: "green" },
]);
```

Then reference the initializer's key from a property definition in your CND file:

```cnd
[mymodule:myComponent] > jnt:content, mix:title
 - color (string, choicelist[myModuleColors])
```

The callback returns the list of choices as `{ label, value, properties? }` objects:

- `label` is the text shown to the editor,
- `value` is the string persisted in the JCR,
- `properties` is optional metadata interpreted by the editing UI, e.g. `{ defaultProperty: true }` to preselect a choice, or `{ image: "/path.png" }` to display a thumbnail.

## The initializer context

The callback receives a context object:

| Property | Description |
|----------|-------------|
| `param` | The parameter from the CND declaration: `choicelist[myModuleColors='myParam']` passes `"myParam"`. Empty string when absent. |
| `locale` | BCP-47 language tag of the content language being edited (e.g. `"en"`, `"fr"`) — not the editor's UI language. Use it to localize labels. |
| `values` | Choices accumulated by previous initializers when several are chained in the CND declaration (e.g. `choicelist[resourceBundle,myModuleColors]`). Include them in your result to keep them. |
| `node` | The node being edited, when it exists (it does not on creation forms). |
| `java` | Escape hatch: the raw Java objects received by the underlying `ModuleChoiceListInitializer` — `propertyDefinition` (`ExtendedPropertyDefinition`), `locale` (`java.util.Locale`), `values`, `context`. |

For example, an initializer that lists values differently per property and honors a parameter:

```ts
registerChoiceListInitializer({ key: "myModuleSizes" }, ({ param, values, java }) => {
  const sizes = [
    ...values,
    { label: "Small", value: "s" },
    { label: "Medium", value: "m" },
  ];
  if (param === "extended") {
    sizes.push({ label: `Large (${java.propertyDefinition.getName()})`, value: "l" });
  }
  return sizes;
});
```

## Good to know

- **Keys are platform-wide.** Initializer keys live in a single namespace shared with Java modules; the last registration wins. Prefix your keys with your module name (`myModuleColors`, not `colors`).
- **Keep callbacks fast.** The callback runs synchronously every time an editor form displays the choicelist.
- **Labels are your responsibility.** Unlike `choicelist[resourceBundle]`, labels are not resolved from resource bundles automatically — return localized labels using the `locale` from the context (you can use your module's i18n setup or any custom logic).
