import { publishAndWaitJobEnding } from '@jahia/cypress'
import { siteKey } from './data'

describe('Validate the concepts of the tutorial: 2 - Making a Hero Section', () => {
    beforeEach('Publish site', () => {
        publishAndWaitJobEnding(`/sites/${siteKey}`, ['en'])
    })
    it('buildNodeUrl should build a valid URL', () => {
        cy.visit(`/sites/${siteKey}/home.html`)
        // test buildNodeUrl works as intended for the background image:
        cy.get(
            `body header[style="background-image:url(/files/live/sites/${siteKey}/files/energy-for-everyone.jpeg)"]`,
        ).should('exist')
    })
    it('the page properties should be correctly retrieved', () => {
        cy.visit(`/sites/${siteKey}/home.html`)
        cy.get('body header h1').contains('Energy for everyone')
        cy.get('body header p').contains('Hydrogen is the most')
    })
    it('the CSS class should be correctly set', () => {
        cy.visit(`/sites/${siteKey}/home.html`)
        cy.get('body header').should('have.attr', 'class')
    })
    const cta = [{ text: 'Discover Hydrogen', link: 'https://en.wikipedia.org/wiki/Hydrogen' }]
    cta.forEach(({ text, link }) => {
        it(`${text}: the CTA buttons should be correctly rendered`, () => {
            cy.visit(`/sites/${siteKey}/home.html`)
            cy.get(`body header div a[href='${link}']`).should('have.text', text)
        })
    })
})
