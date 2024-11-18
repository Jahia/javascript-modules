import {addSimplePage} from '../../utils/Utils';
import {publishAndWaitJobEnding, revokeRoles} from '@jahia/cypress';

const homePage = 'homePageHydratedMenu';

const pages = [
    {path: 'page_1', title: 'Page 1', restricted: false},
    {path: 'page_1/page1_1', title: 'Page 1.1', restricted: true},
    {path: 'page_1/page1_1/page1_1_1', title: 'Page 1.1.1', restricted: true},
    {path: 'page_1/page1_1/page1_1_2', title: 'Page 1.1.2', restricted: true},
    {path: 'page_1/page1_2', title: 'Page 1.2', restricted: false},
    {path: 'page_2', title: 'Page 2', restricted: true},
    {path: 'page_3', title: 'Page 3', restricted: false},
    {path: 'page_3/page3_1', title: 'Page 3.1', restricted: false},
    {path: 'page_3/page3_1/page3_1_1', title: 'Page 3.1.1', restricted: true},
    {path: 'page_3/page3_2', title: 'Page 3.2', restricted: false}
];

function buildLink(page) {
    return `/sites/npmTestSite/${homePage}/${page.path}.html`;
}

describe('Test hydration of the navigation menu', () => {
    before(() => {
        addSimplePage('/sites/npmTestSite', homePage, 'Home (with hydrated menu)', 'en', 'homeHydratedMenu', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]);

        pages.forEach(page => {
            const parentPath = page.path.includes('/') ? page.path.substring(0, page.path.lastIndexOf('/')) : '';
            addSimplePage(`/sites/npmTestSite/${homePage}/${parentPath}`, page.path.split('/').pop(), page.title, 'en', 'homeHydratedMenu');
            if (page.restricted) {
                revokeRoles(`/sites/npmTestSite/${homePage}/${page.path}`, ['reader'], 'guest', 'USER');
            }
        });

        publishAndWaitJobEnding(`/sites/npmTestSite/${homePage}`);
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    it('Should only have the links to the public pages in the initial HTML returned by the server', () => {
        cy.request(`/sites/npmTestSite/${homePage}.html`).then(resp => {
            pages.forEach(page => {
                const link = buildLink(page);
                if (page.restricted) {
                    expect(resp.body).not.to.include(`<a href="${link}">`);
                } else {
                    expect(resp.body).to.include(`<a href="${link}">`);
                }
            });
        });
    });

    it('Should have all links available as root after hydration', () => {
        cy.visit(`/sites/npmTestSite/${homePage}.html`);

        // Wait for the page to be hydrated
        cy.get('div.hydrated').should('exist');

        pages.forEach(page => {
            const link = buildLink(page);
            cy.get(`a[href="${link}"]`).should('exist');
        });
    });

    it('Should not have restricted links available as guest after hydration', () => {
        cy.logout(); // Force to be guest

        cy.visit(`/sites/npmTestSite/${homePage}.html`);

        // Wait for the page to be hydrated
        cy.get('div.hydrated').should('exist');

        pages.forEach(page => {
            const link = buildLink(page);
            if (page.restricted) {
                cy.get(`a[href="${link}"]`).should('not.exist');
            } else {
                cy.get(`a[href="${link}"]`).should('exist');
            }
        });
    });
});
