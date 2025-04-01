import { siteKey } from './data'

describe('Validate the concepts of the tutorial: 3 - The "About Us" Page', () => {
    it('a node type can be rendered using different views', () => {
        cy.login()
        // on the home page, a new CTA can be added
        cy.visit(`/jahia/jcontent/${siteKey}/en/pages/home`)
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('button[data-sel-role="hydrogen:heroCallToAction"]').should('be.visible')
        })
        // but can't be added on the about-us page
        cy.visit(`/jahia/jcontent/${siteKey}/en/pages/about-us`)
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('button[data-sel-role="hydrogen:heroCallToAction"]').should('not.exist')
        })
    })
    const pagesWithFooter = ['about-us', 'about-us/our-team', 'about-us/our-values', 'other-page-single-column']
    pagesWithFooter.forEach((page) => {
        it(`${page}.html: the footer should exist (shared template)`, () => {
            cy.visit(`/sites/${siteKey}/${page}.html`)
            cy.get('body footer nav').within(() => {
                cy.get(`a[href="/sites/${siteKey}/home.html"]`).should('exist').and('have.text', 'Home')
                cy.get(`a[href="/sites/${siteKey}/about-us.html"]`).should('exist').and('have.text', 'About Us')
            })
        })
    })

    it('the footer should not exist on the home page (different template)', () => {
        cy.visit(`/sites/${siteKey}/home.html`)
        cy.get('body footer nav').should('not.exist')
    })
})
