/**
 * Given a site with the following page hierarchy
 *
 * home
 * + - page A
 *   + - page A A
 *     + - page A A A
 *     - page A B
 *     + - page A B A
 *   - page B
 *  + - page B A
 *     + - page B A A
 *     - page B B
 *     + - page B B A
 **/
import {addSimplePage} from '../../utils/Utils';
import {addNode} from '@jahia/cypress';

const menuUrl = (template, depth, lvl = 0, page = '', base = 'home') =>
    `/cms/render/default/en/sites/npmTestSite/home${page}.${template}.html?maxDepth=${depth}&baseline=${base}&startLevel=${lvl}`;

const cleanHTMLTags = str => {
    if (str.includes('<!DOCTYPE html>')) {
        return str.substring(str.indexOf('['), str.lastIndexOf(']') + 1);
    }

    return str;
};

describe('navMenu helper test parameters', () => {
    const templateName = 'navMenu';

    before(() => {
        addSimplePage('/sites/npmTestSite/home/', 'pageA', 'Page A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageA', 'pageAA', 'Page A A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageA/pageAA', 'pageAAA', 'Page A A A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageA', 'pageAB', 'Page A B', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageA/pageAB', 'pageABA', 'Page A B A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/', 'pageB', 'Page B', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageB', 'pageBA', 'Page B A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageB/pageBA', 'pageBAA', 'Page B A A', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageB', 'pageBB', 'Page B B', 'en', 'simple');
        addSimplePage('/sites/npmTestSite/home/pageB/pageBB', 'pageBBA', 'Page B B A', 'en', 'simple');
        // Add menu items
        const externalLink = {
            parentPathOrId: '/sites/npmTestSite/home/',
            name: 'externalLink',
            primaryNodeType: 'jnt:externalLink',
            properties: [{name: 'j:url', value: 'https://www.jahia.com', language: 'en'}]
        };
        addNode(externalLink);
    });

    it(`${templateName}: should have a navMenu item (jmix:navMenuItem) part of the menu`, () => {
        cy.login();
        cy.request(menuUrl(templateName, 1)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            expect(tree.filter(menu => menu.render === '<a href="https://www.jahia.com" >externalLink</a>')).to
                .exist;
        });
        cy.logout();
    });

    it(`${templateName}: should have the dedicated view (menuComponent) for pages`, () => {
        cy.login();
        cy.request(menuUrl(templateName, 1)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            expect(tree.filter(menu => menu.render === '/sites/npmTestSite/home/pageA')).to.exist;
        });
        cy.logout();
    });

    it(`${templateName}: should display the selected depth of items`, () => {
        cy.login();
        cy.request(menuUrl(templateName, 1)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => expect(menu.children).to.not.exist);
        });
        cy.request(menuUrl(templateName, 2)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => {
                if (
                    menu.render === '/sites/npmTestSite/home/pageA' ||
                    menu.render === '/sites/npmTestSite/home/pageB'
                ) {
                    expect(menu.children.length).equals(2);
                    menu.children.forEach(subMenu => expect(subMenu.children).to.not.exist);
                }
            });
        });
        cy.request(menuUrl(templateName, 3)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => {
                if (
                    menu.render === '/sites/npmTestSite/home/pageA' ||
                    menu.render === '/sites/npmTestSite/home/pageB'
                ) {
                    expect(menu.children.length).equals(2);
                    menu.children.forEach(subMenu => expect(subMenu.children.length).equals(1));
                }
            });
        });
        cy.logout();
    });

    it(`${templateName}: should display the menu at the selected level`, () => {
        cy.login();
        // No menu on home page for lvl 1
        cy.request(menuUrl(templateName, 2, 1)).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => expect(menu).to.be.empty);
        });
        // Children at lvl 2 only (start lvl 1 depth 2)
        cy.request(menuUrl(templateName, 2, 1, '/pageA')).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => {
                if (menu.children) {
                    expect(menu.children.length).equals(2);
                    menu.children.forEach(subMenu => {
                        expect(subMenu.children).to.not.exist;
                        expect(subMenu.level).equals(2);
                    });
                } else {
                    expect(menu).to.be.empty;
                }
            });
        });
        cy.logout();
    });

    it(`${templateName}: should display the selected basenode menu`, () => {
        cy.login();
        // Menu should start on pageA
        cy.request(menuUrl(templateName, 2, 0, '/pageA', 'currentPath')).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            console.log(tree);
            expect(tree.length).equals(2);
            tree.forEach(menu => {
                console.log(menu);

                if (menu.render === '/sites/npmTestSite/home/pageA/pageAA') {
                    expect(menu.children[0].render).equals('/sites/npmTestSite/home/pageA/pageAA/pageAAA');
                    return;
                }

                if (menu.render === '/sites/npmTestSite/home/pageA/pageAB') {
                    expect(menu.children[0].render).equals('/sites/npmTestSite/home/pageA/pageAB/pageABA');
                    return;
                }

                assert.fail(`a menu is not suppose to be displayed with render ${menu.render}`);
            });
        });
        cy.logout();
    });

    it(`${templateName}: should set the inPath and selected values for a menu entry`, () => {
        cy.login();
        cy.request(menuUrl(templateName, 3, 0, '/pageA')).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => {
                if (menu.render === '/sites/npmTestSite/home/pageA') {
                    expect(menu.inPath).to.be.true;
                    expect(menu.selected).to.be.true;
                } else {
                    expect(menu.inPath).to.be.false;
                    expect(menu.selected).to.be.false;
                }

                if (menu.children) {
                    menu.children.forEach(subMenu => {
                        expect(subMenu.inPath).to.be.false;
                        expect(subMenu.selected).to.be.false;
                    });
                }
            });
        });

        cy.request(menuUrl(templateName, 3, 0, '/pageA/pageAA')).then(resp => {
            const tree = JSON.parse(cleanHTMLTags(resp.body));
            tree.forEach(menu => {
                if (menu.render === '/sites/npmTestSite/home/pageA') {
                    expect(menu.inPath).to.be.true;
                } else {
                    expect(menu.inPath).to.be.false;
                }

                expect(menu.selected).to.be.false;
                if (menu.children) {
                    menu.children.forEach(subMenu => {
                        if (subMenu.render === '/sites/npmTestSite/home/pageA/pageAA') {
                            expect(subMenu.inPath).to.be.true;
                            expect(subMenu.selected).to.be.true;
                        } else {
                            expect(subMenu.inPath).to.be.false;
                            expect(subMenu.selected).to.be.false;
                        }
                    });
                }
            });
        });
        cy.logout();
    });
});
