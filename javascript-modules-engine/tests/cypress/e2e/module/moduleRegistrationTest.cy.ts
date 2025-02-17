import { addNode, getNodeTypes, publishAndWaitJobEnding } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Check that components of a module are correctly registered', () => {
    it('Create a page with .hbs template', function () {
        cy.login()

        addSimplePage('/sites/javascriptTestSite/home', 'simple', 'Simple page', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/javascriptTestSite/home/simple/pagecontent',
                name: 'simple-text',
                primaryNodeType: 'jnt:text',
                properties: [{ name: 'text', value: 'Main content text', language: 'en' }],
            })
            publishAndWaitJobEnding('/sites/javascriptTestSite/home/simple', ['en'])
            cy.visit('/sites/javascriptTestSite/home/simple.html')
            cy.contains('Main content text')
        })

        cy.logout()
    })

    it('Verify nodeTypes and icons are registered', function () {
        cy.login()
        getNodeTypes({ includeTypes: ['javascriptExample:test'] })
            .its('data.jcr.nodeTypes.nodes')
            .then((nodes) => {
                const simpleType = nodes.find((node) => node.name === 'javascriptExample:test')
                expect(
                    simpleType.properties.filter((property) => property.name === 'prop1' || property.name === 'prop2')
                        .length,
                ).to.eq(2)
                expect(
                    simpleType.supertypes.filter(
                        (superType) => superType.name === 'javascriptExampleMix:javascriptExampleComponent',
                    ).length,
                ).to.eq(1)
                expect(simpleType.icon).to.eq('/modules/jahia-javascript-module-example/icons/javascriptExample_test')
            })
        cy.logout()
    })
})
