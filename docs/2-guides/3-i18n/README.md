---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/i18n
  jcr:title: Preparing for internationalization (i18n)
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Jahia is a multilingual CMS, the goal of this guide is to explain how to properly prepare your module for internationalization (i18n).

## Content Definition

Even when your Jahia integration is not destined to be multilingual, it is a good practice to prepare it for i18n. The multilingual edition interface only appears when more than one language is configured on the website (⚙️ > Sites > Choose a website > Languages), making the preparation invisible until used.

To make a field translatable, you only need to add the `i18n` attribute to the field definition, and Jahia takes care of the rest. It works for all field types and inputs.

```cnd
// Before
[example:contentType] > jnt:content
 - body (string, richtext)

// After
[example:contentType] > jnt:content
 - body (string, richtext) i18n
```

There is no such thing as i18n-ized child nodes, the content structure is the same for all languages. The escape hatch for this is per-language visibility conditions (Advanced Editing > Visibility > Languages).

We recommend that you add the `i18n` attribute to:

- All visitor-facing free text fields (e.g. string, richtext, textarea)
- All weak references that point to images that may content texts or people

Under the hood, classic (non-i18n) fields will be stored on the node itself, while i18n fields will be stored as properties of `jnt:translation` child nodes named `j:translation_<language>`. You don't need to worry about this, but it is useful to know for debugging purposes.

## Edition Interfaces

Jahia maintains almost all of the translations for the edition interfaces. The only thing we cannot translate for you is the display name of node types, fields and choice list options.

To offer a multilingual edition interface, provide translations in `<module>_<language>.properties` files in your module in the `settings/resources/` directory.

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

:eyes:
