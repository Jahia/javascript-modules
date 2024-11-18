import {addNode} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Test on add resources component/helper', () => {
    const pageName = 'testAddResources';

    before('Create test page and contents', () => {
        addSimplePage('/sites/npmTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/npmTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'npmExample:testCurrentContent',
                properties: [
                    {name: 'jcr:title', value: 'NPM test component'},
                    {name: 'prop1', value: 'prop1 value'},
                    {name: 'propMultiple', values: ['value 1', 'value 2', 'value 3']},
                    {
                        name: 'propRichText',
                        value: '<p data-testid="propRichTextValue">Hello this is a sample rich text</p>'
                    }
                ]
            });
        });
    });

    it(`${pageName}: should not contain a div in the head tag in the page source code`, () => {
        cy.login();
        cy.request(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`) // Replace with your website URL
            .then(response => {
                const regex = /<head>[\s\S]*?<div>[\s\S]*?<\/head>/;
                expect(regex.test(response.body)).to.be.false;
            });
        cy.logout();
    });

    it(`${pageName} : should contain a link tag in the head tag to load the CSS styles`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('head link[href="/modules/jahia-npm-module-example/css/styles.css"]').then(($link: JQuery<HTMLLinkElement>) => {
            expect($link.attr('id')).to.match(/^staticAssetCSS/);
        });
        cy.logout();
    });

    it(`${pageName} : should contain a script tag under the body tag`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('body script[src="/modules/jahia-npm-module-example/javascript/body-script.js"]').should('exist').then(($script: JQuery<HTMLScriptElement>) => {
            expect($script.attr('id')).to.match(/^staticAssetJavascriptBODY/); // Replace with your specific string
        });
        cy.logout();
    });

    it(`${pageName} : should contain the test body element created by the body script`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('#testBodyElement').should('exist');
        cy.logout();
    });

    it(`${pageName} : should contain a script tag under the head tag`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get(`head script[src="${'/modules/jahia-npm-module-example/javascript/head-script.js'}"]`).should('exist').then(($script: JQuery<HTMLScriptElement>) => {
            expect($script.attr('id')).to.match(/^staticAssetJavascript/); // Replace with your specific string
        });
        cy.logout();
    });

    it(`${pageName} : should contain the test head element created by the head script`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('#testHeadElement').should('exist');
        cy.logout();
    });

    it(`${pageName} : should contain the test inline script element created by the inline script`, () => {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('#testInlineScript').should('exist');
        cy.logout();
    });
});
