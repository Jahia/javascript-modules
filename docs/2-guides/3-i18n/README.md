---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/i18n
  jcr:title: Preparing for Internationalization (i18n)
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Jahia is a multilingual CMS, the goal of this guide is to explain how to properly prepare your module for internationalization (i18n).

## Content Definition

Even when your Jahia integration is not destined to be multilingual, it is a good practice to prepare it for i18n. The multilingual edition interface only appears when more than one language is configured on the website (⚙︎ > Sites > Choose a website > Languages), making the preparation invisible until used.

To make a field translatable, you only need to add the `i18n` attribute to the field definition, and Jahia takes care of the rest. It works for all field types and inputs.

```cnd
// Without `i18n`, the `body` field is shared across all languages
[example:contentType] > jnt:content
 - body (string, richtext)

// With `i18n`, the `body` field is translatable, each language has its own value
[example:contentType] > jnt:content
 - body (string, richtext) i18n
```

There is no such thing as i18n child nodes: the content structure is the same for all languages. The escape hatch for this is per-language visibility conditions (Advanced Editing > Visibility > Languages).

We recommend that you add the `i18n` attribute to:

- All visitor-facing free text fields (e.g. string, richtext, textarea)
- All weak references that point to images that may contain text or people

Under the hood, non-i18n fields will be stored on the node itself, while i18n fields will be stored as properties of `jnt:translation` child nodes named `j:translation_<language>`. You don't need to worry about this, but it is useful to know for debugging purposes.

## Edition Interfaces

Jahia maintains almost all of the translations for the edition interfaces. The only thing we cannot translate for you is the display name of node types, fields, and choice list options.

To offer a multilingual edition interface, provide translations in `<module>_<language>.properties` (or `<module>.properties` in English) files in your module in the `settings/resources/` directory.

```properties
# Example for the `luxe:header` node type
# luxe-jahia-demo.properties
luxe_header=Page Header
luxe_header.title=Title
luxe_header.subtitle=Subtitle
luxe_header.subtitle.ui.tooltip=The subtitle is only shown with certain views.

# luxe-jahia-demo_fr.properties
luxe_header=En-tête de page
luxe_header.title=Titre
luxe_header.subtitle=Sous-titre
luxe_header.subtitle.ui.tooltip=Le sous-titre n'est affiché qu'avec certaines vues.
```

![Edition interface in English](header_en.png) ![Edition interface in French](header_fr.png)

:::info
`.ui.tooltip` supports basic HTML tags, such as `<strong>`. This also means you need to escape `<` and `>` as `&lt;` and `&gt;` if you want to display them as text.
:::

To provide translations for choice list options, use the following format:

```properties
# The field is declared as
# - type (string, choicelist[resourceBundle]) < 'house', 'apartment', 'building'
luxe_estate.type=Type of Real Estate
luxe_estate.type.house=House
luxe_estate.type.apartment=Apartment
luxe_estate.type.building=Building
```

![Choice list interface in English](choicelist_en.png)

Don't forget the `[resourceBundle]` suffix in the field declaration, otherwise the translations will be ignored.

## Views and Templates

When creating views and templates, you may want to include basic text such as `<a href="...">Read more</a>` links or `Written by {{author}}` labels. For all user-facing translations, we use the [`i18next`](https://www.i18next.com/) and [`react-i18next`](https://react.i18next.com/) libraries. For convenience, we cover the basics in this guide, but you can refer to the official documentation for more details.

Translations are stored in JSON files located in the `settings/locales` directory, named `<language>.json`. Their structure is a JSON object (potentially nested), with key-value pairs where the key is used in the code and the value is displayed to the user. For example:

```json
// en.json
{
  "key1": "Read more",
  "key2": "Written by {{author}}"
}

// fr.json
{
  "key1": "Lire la suite",
  "key2": "Écrit par {{author}}"
}
```

The translation files are loaded automatically for you. The translation code is the same for both client and server code:

```jsx
// Import the `useTranslation` hook
import { useTranslation } from "react-i18next";

function MyComponent() {
  // Get a contextualized translation function
  const { t } = useTranslation();

  return (
    <div>
      {/* Read more */}
      <a href="...">{t("key1")}</a>

      {/* Written by John Doe */}
      <p>{t("key2", { author: "John Doe" })}</p>
    </div>
  );
}
```

## IDE Integration

The `npm init @jahia/module@latest` automatically configures the [i18n ally](https://github.com/lokalise/i18n-ally#readme) extension for VS Code. When installed, it allows you to display and edit translations directly from the code, without having to open the JSON files:

![alt text](i18n-ally-display.png)

It also provides a VS Code command to extract hardcoded strings into the translation files:

![alt text](i18n-ally-extract.png)

The `🌍 Extract text into i18n messages` command will automatically replace the selected string with a `t("...")` call.

It can also be used to list missing or unused translations and enables collaboration features.

Check out the [i18n ally documentation](https://github.com/lokalise/i18n-ally/wiki) for a complete list of features and configuration options.

### Best Practices

#### Don't use concatenation

It could be tempting to write something like this: `t("key") + " " + author` to append dynamic data to a translation, but this will make translation impossible in languages with different word order.

For simple use cases, use [interpolation](https://www.i18next.com/translation-function/interpolation): `"Written by {{author}}"` and `t("key", { author })`.

For complex use cases involving HTML tags, use the [`Trans` component](https://react.i18next.com/latest/trans-component):

<!-- prettier-ignore -->
```jsx
import { Trans } from "react-i18next";

// "key": "Written by <a>{{author}}</a>"
<Trans
  i18nKey="key"
  values={{ author: "John Doe" }}
  components={{ a: <a href="..." /> }}
/>
```

#### Use random keys

This may sound counter-intuitive, but using semantic keys like `read-more` or `written-by-author` [is an anti-pattern](https://inlang.com/blog/human-readable-message-ids). Here is a summary of the reasons invoked in the article:

- Discourage renaming keys, therefore preserving history

  When the English translation evolves (e.g. "Read more" becomes "Continue reading"), developers are tempted to rename the key from `read-more` to `continue-reading`, removing the translation history.

- Discourage copy-pasting the same translation in different contexts

  For instance, the word "close" has two meanings: "shut" (verb) and "near" (adjective). Having a `"close": "Close"` pair would make it impossible to translate this word in languages where the two meanings are different words.

- Avoid bikeshedding over key names and nesting

i18n ally will generate a random key when using the extract command.

## Reference

For further reference, you can check out the documentation of the libraries and tools we use for i18n:

- [i18next](https://www.i18next.com/)
- [react-i18next](https://react.i18next.com/)
- [i18n ally](https://github.com/lokalise/i18n-ally/wiki)

We recommend that you also consult the [i18next Best Practices](https://www.i18next.com/principles/best-practices) guide.
