import { addNode, deleteNode } from '@jahia/cypress'
import 'cypress-wait-until'
import { addSimplePage } from '../../utils/Utils'

describe('Test priority parameter on views', () => {
    const pageName = 'testPriorityViewPage'
    const siteKey = 'javascriptTestSite'
    const examples = [
        { nodeType: 'javascriptExample:testPriorityView1', expectedPriority: 6 },
        { nodeType: 'javascriptExample:testPriorityView2', expectedPriority: -3 },
        { nodeType: 'javascriptExample:testPriorityView3', expectedPriority: 0 },
        { nodeType: 'javascriptExample:testPriorityView4', expectedPriority: 13 },
    ]

    beforeEach('Create test page before each test', () => {
        addSimplePage(`/sites/${siteKey}`, pageName, 'Test components priorities', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ])
    })
    afterEach('Delete the test page after each test', () => {
        deleteNode(`/sites/${siteKey}/${pageName}`)
    })

    examples.forEach(({ nodeType, expectedPriority }) => {
        it(`${nodeType}: GIVEN multiple views with different priorities WHEN resolving the view THEN the view with the highest priority (${expectedPriority}) is used`, () => {
            addNode({
                parentPathOrId: `/sites/${siteKey}/${pageName}/pagecontent`,
                name: 'testPriority',
                primaryNodeType: nodeType,
            })
            cy.login()
            cy.visit(`/jahia/jcontent/${siteKey}/en/pages/${pageName}`)
            cy.iframe('#page-builder-frame-1').within(() => {
                cy.get('div[data-testid="testPriorityView"] span[data-testid="priorityValue"]').should(
                    'have.text',
                    expectedPriority,
                )
            })
            cy.logout()
        })
    })
})
