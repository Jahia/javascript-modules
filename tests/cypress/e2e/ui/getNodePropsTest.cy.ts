import {addNode} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('getNodeProps function test', () => {
    before('Create test page and contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testGetNodeProps', 'Test getNodeProps', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            },
            {
                name: 'header',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testGetNodeProps/pagecontent',
                name: 'getNodePropsTest',
                primaryNodeType: 'npmExample:testGetNodeProps',
                properties: [
                    {name: 'smallText', value: 'smallTextValue'},
                    {name: 'textarea', value: 'textareaValue'},
                    {name: 'choicelist', value: 'choice2'},
                    {name: 'long', value: '2', type: 'LONG'},
                    {name: 'double', value: '3.6', type: 'DOUBLE'},
                    {name: 'boolean', value: 'true', type: 'BOOLEAN'},
                    {name: 'weakreference', value: '/sites/npmTestSite/home/testGetNodeProps/pagecontent', type: 'WEAKREFERENCE'},
                    {name: 'bigtext', value: '<div data-testid="getNodeProps_bigtext_inner">bigtext value</div>'},
                    {name: 'date', value: '2023-12-26T01:30:25.243Z', type: 'DATE'},
                    {name: 'decimal', value: '4535353.55665775', type: 'DECIMAL'},
                    {name: 'uri', value: 'https://www.jahia.com'},
                    {name: 'name', value: 'nameValue'},
                    {name: 'path', value: '/sites/npmTestSite/home/testGetNodeProps/pagecontent'},
                    {name: 'multipleSmallText', values: ['smallTextValue1', 'smallTextValue2']},
                    {name: 'multipleTextarea', values: ['textareaValue1', 'textareaValue2']},
                    {name: 'multipleChoicelist', values: ['choice1', 'choice2']},
                    {name: 'multipleLong', values: ['1', '2'], type: 'LONG'},
                    {name: 'multipleDouble', values: ['1.5', '2.5'], type: 'DOUBLE'},
                    {name: 'multipleBoolean', values: ['true', 'false'], type: 'BOOLEAN'},
                    {name: 'multipleWeakreference', values: ['/sites/npmTestSite/home/testGetNodeProps/pagecontent', '/sites/npmTestSite/home/testGetNodeProps/header'], type: 'WEAKREFERENCE'},
                    {name: 'multipleBigtext', values: ['<div data-testid="getNodeProps_multipleBigtext_inner1">bigtext value1</div>', '<div data-testid="getNodeProps_multipleBigtext_inner2">bigtext value2</div>']},
                    {name: 'multipleDate', values: ['2023-12-26T01:30:25.243Z', '2023-12-27T01:30:25.243Z'], type: 'DATE'},
                    {name: 'multipleDecimal', values: ['4535353.55665775', '4535353.55665776'], type: 'DECIMAL'},
                    {name: 'multipleUri', values: ['https://www.jahia.com', 'https://www.google.com']},
                    {name: 'multipleName', values: ['nameValue1', 'nameValue2']},
                    {name: 'multiplePath', values: ['/sites/npmTestSite/home/testGetNodeProps/pagecontent', '/sites/npmTestSite/home/testGetNodeProps/header']}
                ]
            });
        });
    });

    it('Verify property values from getNodeProps', function () {
        cy.login();
        cy.visit('/jahia/page-composer/default/en/sites/npmTestSite/home/testGetNodeProps.html');
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testGetNodeProps.html');

        cy.get('div[data-testid="getNodeProps_smallText"]').contains('smallTextValue');
        cy.get('div[data-testid="getNodeProps_textarea"]').contains('textareaValue');
        cy.get('div[data-testid="getNodeProps_choicelist"]').contains('choice2');
        cy.get('div[data-testid="getNodeProps_long"]').contains('2');
        cy.get('div[data-testid="getNodeProps_double"]').contains('3.6');
        cy.get('div[data-testid="getNodeProps_boolean"]').contains('true');
        cy.get('div[data-testid="getNodeProps_weakreference"]').contains('/sites/npmTestSite/home/testGetNodeProps/pagecontent');
        cy.get('div[data-testid="getNodeProps_bigtext_inner"]').contains('bigtext value');
        cy.get('div[data-testid="getNodeProps_date"]').contains('2023-12-26T01:30:25.243Z');
        cy.get('div[data-testid="getNodeProps_decimal"]').contains('4535353.55665775');
        cy.get('div[data-testid="getNodeProps_uri"]').contains('https://www.jahia.com');
        cy.get('div[data-testid="getNodeProps_name"]').contains('nameValue');
        cy.get('div[data-testid="getNodeProps_path"]').contains('/sites/npmTestSite/home/testGetNodeProps/pagecontent');

        cy.logout();
    });

    it('Verify property values from getNodeProps (multiple)', function () {
        cy.login();
        cy.visit('/jahia/page-composer/default/en/sites/npmTestSite/home/testGetNodeProps.html');
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testGetNodeProps.html');

        cy.get('div[data-testid="getNodeProps_multipleSmallText_1"]').contains('smallTextValue1');
        cy.get('div[data-testid="getNodeProps_multipleSmallText_2"]').contains('smallTextValue2');
        cy.get('div[data-testid="getNodeProps_multipleTextarea_1"]').contains('textareaValue1');
        cy.get('div[data-testid="getNodeProps_multipleTextarea_2"]').contains('textareaValue2');
        cy.get('div[data-testid="getNodeProps_multipleChoicelist_1"]').contains('choice1');
        cy.get('div[data-testid="getNodeProps_multipleChoicelist_2"]').contains('choice2');
        cy.get('div[data-testid="getNodeProps_multipleLong_1"]').contains('1');
        cy.get('div[data-testid="getNodeProps_multipleLong_2"]').contains('2');
        cy.get('div[data-testid="getNodeProps_multipleDouble_1"]').contains('1.5');
        cy.get('div[data-testid="getNodeProps_multipleDouble_2"]').contains('2.5');
        cy.get('div[data-testid="getNodeProps_multipleBoolean_1"]').contains('true');
        cy.get('div[data-testid="getNodeProps_multipleBoolean_2"]').contains('false');
        cy.get('div[data-testid="getNodeProps_multipleWeakreference_1"]').contains('/sites/npmTestSite/home/testGetNodeProps/pagecontent');
        cy.get('div[data-testid="getNodeProps_multipleWeakreference_2"]').contains('/sites/npmTestSite/home/testGetNodeProps/header');
        cy.get('div[data-testid="getNodeProps_multipleBigtext_inner1"]').contains('bigtext value1');
        cy.get('div[data-testid="getNodeProps_multipleBigtext_inner2"]').contains('bigtext value2');
        cy.get('div[data-testid="getNodeProps_multipleDate_1"]').contains('2023-12-26T01:30:25.243Z');
        cy.get('div[data-testid="getNodeProps_multipleDate_2"]').contains('2023-12-27T01:30:25.243Z');
        cy.get('div[data-testid="getNodeProps_multipleDecimal_1"]').contains('4535353.55665775');
        cy.get('div[data-testid="getNodeProps_multipleDecimal_2"]').contains('4535353.55665776');
        cy.get('div[data-testid="getNodeProps_multipleUri_1"]').contains('https://www.jahia.com');
        cy.get('div[data-testid="getNodeProps_multipleUri_2"]').contains('https://www.google.com');
        cy.get('div[data-testid="getNodeProps_multipleName_1"]').contains('nameValue1');
        cy.get('div[data-testid="getNodeProps_multipleName_2"]').contains('nameValue2');
        cy.get('div[data-testid="getNodeProps_multiplePath_1"]').contains('/sites/npmTestSite/home/testGetNodeProps/pagecontent');
        cy.get('div[data-testid="getNodeProps_multiplePath_2"]').contains('/sites/npmTestSite/home/testGetNodeProps/header');

        cy.logout();
    });

    it('Verify property values from getNodeProps (Types and safety)', function () {
        cy.login();
        cy.visit('/jahia/page-composer/default/en/sites/npmTestSite/home/testGetNodeProps.html');
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testGetNodeProps.html');

        cy.get('div[data-testid="getNodeProps_propNotSet"]').should('be.empty');
        cy.get('div[data-testid="getNodeProps_propNotExists"]').should('be.empty');
        cy.get('div[data-testid="getNodeProps_checkBooleanType"]').contains('true');
        cy.get('div[data-testid="getNodeProps_checkLongType"]').contains('true');
        cy.get('div[data-testid="getNodeProps_checkDoubleType"]').contains('true');

        cy.logout();
    });
});
