import { defineJahiaComponent, server, useServerContext } from "@jahia/javascript-modules-library";

// Use the legacy (deprecated) registration method to register a view component with minimal configuration
export const TestLegacyRegistrationMinimal = () => (
  <div data-testid="legacyRegistrationMinimal">
    javascriptExample:testLegacyRegistrationMinimal view component
  </div>
);

TestLegacyRegistrationMinimal.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testLegacyRegistrationMinimal",
  displayName: "Test Legacy registration minimal",
  componentType: "view",
});

// Use the legacy (deprecated) registration method to register a view component with advanced configuration
export const TestLegacyRegistrationAdvanced = () => {
  const { currentResource } = useServerContext();
  const myProp = currentResource.getNode().getPropertyAsString("myProp");
  const testRegistryName = server.registry.get("view", "legacyRegistrationAdvancedIdentifier").name;

  return (
    <div data-testid="legacyRegistrationAdvanced">
      javascriptExample:testLegacyRegistrationAdvanced view component
      <span data-testid="registryName">{testRegistryName}</span>
    </div>
  );
};

TestLegacyRegistrationAdvanced.jahiaComponent = defineJahiaComponent({
  id: "legacyRegistrationAdvancedIdentifier",
  name: "legacyRegistrationAdvancedName",
  displayName: "Test Legacy registration Advanced",
  componentType: "view",
  nodeType: "javascriptExample:testLegacyRegistrationAdvanced",
  properties: {
    myProp: "my value",
  },
});
console.log(
  "TestLegacyRegistrationAdvanced.jahiaComponent",
  TestLegacyRegistrationAdvanced.jahiaComponent,
);
