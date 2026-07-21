import {
  registerChoiceListInitializer,
  type ChoiceListValue,
} from "@jahia/javascript-modules-library";

/**
 * Test fixture for JS-declared choicelist initializers, referenced from
 * settings/definitions.cnd as choicelist[testColorsInitializer].
 *
 * Exercises: localized labels, properties (defaultProperty), the CND parameter
 * (choicelist[testColorsInitializer='warm']), previous values passthrough, and the
 * raw Java escape hatch (property definition name).
 */
registerChoiceListInitializer({ key: "testColorsInitializer" }, ({ param, locale, values, java }) => {
  const choices: ChoiceListValue[] = [
    ...values,
    { label: locale.startsWith("fr") ? "Rouge" : "Red", value: "red" },
    { label: "Green", value: "green", properties: { defaultProperty: true } },
    // escape hatch probe: label derived from the raw ExtendedPropertyDefinition
    { label: `prop:${java.propertyDefinition.getName()}`, value: "propName" },
  ];
  if (param === "warm") {
    choices.push({ label: "Orange", value: "orange" });
  }
  return choices;
});
