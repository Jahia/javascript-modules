describe('Check that the NPM module has been transformed properly and has the proper header values',
    () => {
        it('Check the transformed module headers', () => {
            cy.executeGroovy('groovy/getBundleHeaders.groovy', {BUNDLE_SYMBOLIC_NAME: 'jahia-npm-module-example', BUNDLE_VERSION: '1.0.0'})
                .then(result => {
                    console.log(result);
                    expect(result).to.contain('Bundle-Category: jahia-npm-module');
                    expect(result).to.contain('Bundle-Description: Jahia NPM Test module');
                    expect(result).to.contain('Jahia-GroupId: org.example.modules.npm');
                    expect(result).to.contain('Bundle-License: MIT');
                    expect(result).to.contain('Bundle-Name: @jahia/npm-module-example (npm module)');
                    expect(result).to.contain('Bundle-SymbolicName: jahia-npm-module-example');
                    expect(result).to.contain('Bundle-Vendor: Jahia Solutions Group SA');
                    expect(result).to.contain('Bundle-Version: 1.0.0');
                    expect(result).to.contain('Jahia-Depends: default');
                    expect(result).to.contain('Jahia-Module-Type: templatesSet');
                    expect(result).to.contain('Jahia-NPM-InitScript: dist/main.js');
                    expect(result).to.contain('Jahia-Required-Version: 8.2.0.0-SNAPSHOT');
                    expect(result).to.contain('Jahia-Static-Resources: /css,/javascript,/icons,/static');
                });
        });
    }
);
