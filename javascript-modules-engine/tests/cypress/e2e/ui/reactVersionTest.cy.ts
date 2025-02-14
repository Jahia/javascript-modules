import { addNode, deleteNode, publishAndWaitJobEnding } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Test React version', () => {
    before('Create test data', () => {
        addSimplePage('/sites/npmTestSite/home', 'testReactVersion', 'testReactVersion', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testReactVersion/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testReactVersion',
            })
        })

        publishAndWaitJobEnding('/sites/npmTestSite')
    })

    after('Cleanup test data', () => {
        deleteNode('/sites/npmTestSite/home/testReactVersion')
        publishAndWaitJobEnding('/sites/npmTestSite')
    })

    it('React version should be correct', function () {
        cy.login()
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testReactVersion.html')
        cy.get('span[data-testid="react-version"]').should('have.text', '19.0.0')
        cy.logout()
    })
})
