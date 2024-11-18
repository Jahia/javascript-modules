import {JContent, JContentPageBuilder} from '@jahia/jcontent-cypress/dist/page-object/jcontent';
import {addNode, Collapsible, getComponentBySelector, publishAndWaitJobEnding} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';
describe('Check that NPM module settings (UI extensions, rules, configs) are correctly deployed', () => {
    before('Create test page and contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testModuleSettings', 'testModuleSettings', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testModuleSettings/pagecontent',
                name: 'testContentEditorExtension',
                primaryNodeType: 'npmExample:testContentEditorExtension'
            });

            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testModuleSettings/pagecontent',
                name: 'testRule',
                primaryNodeType: 'npmExample:testRule',
                properties: [
                    {name: 'triggerProp', value: 'Trigger prop set'}
                ]
            });

            publishAndWaitJobEnding('/sites/npmTestSite');
        });
    });

    it('Ensure Content editor UI extension is correctly registered', function () {
        cy.login();
        const jcontent = new JContentPageBuilder(JContent.visit('npmTestSite', 'en', 'pages/home/testModuleSettings'));
        jcontent.getModule('/sites/npmTestSite/home/testModuleSettings/pagecontent').get().scrollIntoView();
        jcontent.getModule('/sites/npmTestSite/home/testModuleSettings/pagecontent/testContentEditorExtension').doubleClick();
        getComponentBySelector(Collapsible, '[data-sel-content-editor-fields-group="Classification and Metadata"]').shouldBeExpanded();
        cy.logout();
    });

    it('Ensure Jahia rule is correctly registered and working', function () {
        cy.login();
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testModuleSettings.html');
        cy.get('div[data-testid="testRule_triggerProp"]').should('contain', 'Trigger prop set');
        cy.get('div[data-testid="testRule_resultProp"]').should('contain', 'It works');
        cy.logout();
    });

    it('Ensure Jahia URLRewrite rule is correctly registered and working', function () {
        cy.login();
        cy.visit('/npmModuleURLRewriteTest');
        cy.get('div[data-testid="testRule_triggerProp"]').should('contain', 'Trigger prop set');
        cy.logout();
    });
});
