describe("Check that the Javascript module has been transformed properly and has the proper header values", () => {
  it("Check the transformed module headers", () => {
    cy.executeGroovy("groovy/getBundleHeaders.groovy", {
      BUNDLE_SYMBOLIC_NAME: "javascript-modules-engine-test-module",
    }).then((result) => {
      console.log(result);
      expect(result).to.contain("Bundle-Category: jahia-javascript-module");
      expect(result).to.contain(
        "Bundle-Description: Test module for Javascript Module Engine"
      );
      expect(result).to.contain("Jahia-GroupId: org.jahia.test");
      expect(result).to.contain("Bundle-License: MIT");
      expect(result).to.contain(
        "Bundle-Name: JS Modules Engine Test Module (javascript module)"
      );
      expect(result).to.contain(
        "Bundle-SymbolicName: javascript-modules-engine-test-module"
      );
      expect(result).to.contain("Bundle-Vendor: Jahia Solutions Group SA");
      expect(result).to.contain("Bundle-Version: ");
      // TODO to enable once javascript-modules-engine >= 0.4.0 is included in jahia-pack
      // expect(result).to.contain('Jahia-Depends: default,legacy-default-components,javascript-modules-engine')
      expect(result).to.contain("Jahia-Module-Type: templatesSet");
      expect(result).to.contain(
        "Jahia-javascript-InitScript: dist/server/index.js"
      );
      expect(result).to.contain("Jahia-Required-Version: 8.2.0.0-SNAPSHOT");
      expect(result).to.contain(
        "Jahia-Static-Resources: /css,/javascript,/icons,/dist/client,/static"
      );
    });
  });
});
