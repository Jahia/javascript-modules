import { addNode, publishAndWaitJobEnding } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Test OSGi configuration in views', () => {
    const pageName = 'testOSGi'

    before('Create test page', () => {
        addSimplePage('/sites/javascriptTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/javascriptTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'javascriptExample:testOSGi',
            })
        })
        publishAndWaitJobEnding('/sites/javascriptTestSite')
    })

    it(`is polite, says hello and sorts numbers`, function () {
        cy.login()
        cy.visit(`/cms/render/default/en/sites/javascriptTestSite/home/${pageName}.html`)
        cy.get('p[data-testid="hello"]').should('contain', 'Good morning World!')
        cy.get('p[data-testid="numbers"]').should('contain', '1, 2, 3, 4')
        cy.logout()
    })
})
