describe('Check that the Javascript module has been transformed properly and has the proper header values', () => {
    it('Check the transformed module headers', () => {
        cy.executeGroovy('groovy/getBundleHeaders.groovy', {
            BUNDLE_SYMBOLIC_NAME: 'jahia-javascript-module-example',
            BUNDLE_VERSION: '1.0.0',
        }).then((result) => {
            console.log(result)
            expect(result).to.contain('Bundle-Category: jahia-javascript-module')
            expect(result).to.contain('Bundle-Description: Javascript module test')
            expect(result).to.contain('Jahia-GroupId: org.example.modules.javascript')
            expect(result).to.contain('Bundle-License: MIT')
            expect(result).to.contain('Bundle-Name: @jahia/javascript-module-example (javascript module)')
            expect(result).to.contain('Bundle-SymbolicName: jahia-javascript-module-example')
            expect(result).to.contain('Bundle-Vendor: Jahia Solutions Group SA')
            expect(result).to.contain('Bundle-Version: 1.0.0')
            expect(result).to.contain('Jahia-Depends: default,legacy-default-components,javascript-modules-engine')
            expect(result).to.contain('Jahia-Module-Type: templatesSet')
            expect(result).to.contain('Jahia-javascript-InitScript: javascript/server/index.js')
            expect(result).to.contain('Jahia-Required-Version: 8.2.0.0-SNAPSHOT')
            expect(result).to.contain('Jahia-Static-Resources: /css,/javascript,/icons,/static')
        })
    })
})
