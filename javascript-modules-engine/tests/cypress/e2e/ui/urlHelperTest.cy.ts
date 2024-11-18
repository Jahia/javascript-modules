import {addNode, addVanityUrl, deleteNode, publishAndWaitJobEnding} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Test on url helper', () => {
    before('Create test page and contents', () => {
        cy.fixture('testData/image.jpg', 'binary').then(image => {
            const blob = Cypress.Blob.binaryStringToBlob(image, 'image/jpeg');
            const file = new File([blob], 'image.jpg', {type: blob.type});
            cy.apollo({
                variables: {
                    path: '/sites/npmTestSite/files',
                    name: 'image.jpg',
                    mimeType: 'image/jpeg',
                    file: file
                },
                mutationFile: 'graphql/jcrUploadFile.graphql'
            });
        });
        addSimplePage('/sites/npmTestSite/home', 'linkedPage', 'linkedPage', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]);
        addSimplePage('/sites/npmTestSite/home', 'testUrl', 'testUrl', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testUrl/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testUrl',
                properties: [
                    {
                        name: 'linknode',
                        value: '/sites/npmTestSite/home/linkedPage',
                        type: 'WEAKREFERENCE',
                        language: 'en'
                    },
                    {name: 'image', value: '/sites/npmTestSite/files/image.jpg', type: 'WEAKREFERENCE'}
                ]
            });
        });

        publishAndWaitJobEnding('/sites/npmTestSite');
    });

    after('Clean', () => {
        deleteNode('/sites/npmTestSite/files/image.jpg');
        deleteNode('/sites/npmTestSite/home/testUrl');
        publishAndWaitJobEnding('/sites/npmTestSite');
    });

    const testUrl = urls => {
        for (const url of urls) {
            if (url.expectedURL) {
                cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`)
                    .should('have.attr', url.attribute)
                    .should('include', url.expectedURL);
            } else if (url.attributeShouldNotExists) {
                cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`).should('not.have.attr', url.attribute);
            } else {
                cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`).should('have.attr', url.attribute, '');
            }
        }
    };

    it('Generated URLs should be correct', function () {
        cy.login();
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testUrl.html');

        // Check default workspace in preview
        testUrl([
            {
                dataTestId: 'image_reference',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/files/default/sites/npmTestSite/files/image.jpg'
            },
            {
                dataTestId: 'image_static_resource',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/modules/jahia-npm-module-example/static/images/goat.jpg'
            },
            {
                dataTestId: 'content_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_edit',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/edit/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_preview',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_live',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_language_fr',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/fr/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.html?'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param2=value2'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param1=value1'
            },
            {
                dataTestId: 'action_url',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.myAction.do'
            },
            {
                dataTestId: 'fragment_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/testUrl/pagecontent/test.html.ajax'
            },
            {
                dataTestId: 'path_not_exists',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            },
            {
                dataTestId: 'no_weakref',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            }
        ]);

        // Check live workspace
        cy.visit('/sites/npmTestSite/home/testUrl.html');
        testUrl([
            {
                dataTestId: 'image_reference',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/files/live/sites/npmTestSite/files/image.jpg'
            },
            {
                dataTestId: 'image_static_resource',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/modules/jahia-npm-module-example/static/images/goat.jpg'
            },
            {
                dataTestId: 'content_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_edit',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/edit/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_preview',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_live',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_language_fr',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/fr/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.html?'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param2=value2'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param1=value1'
            },
            {
                dataTestId: 'action_url',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.myAction.do'
            },
            {
                dataTestId: 'fragment_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/testUrl/pagecontent/test.html.ajax'
            },
            {
                dataTestId: 'path_not_exists',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            },
            {
                dataTestId: 'no_weakref',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            }
        ]);

        cy.logout();
    });

    it('Generated URLs should be correct with vanity', function () {
        // Add a vanity url
        addVanityUrl('/sites/npmTestSite/home/linkedPage', 'en', '/vanityUrlTest');
        publishAndWaitJobEnding('/sites/npmTestSite/home/linkedPage');

        cy.login();
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testUrl.html');

        // Check default workspace in preview
        testUrl([
            {
                dataTestId: 'image_reference',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/files/default/sites/npmTestSite/files/image.jpg'
            },
            {
                dataTestId: 'image_static_resource',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/modules/jahia-npm-module-example/static/images/goat.jpg'
            },
            {
                dataTestId: 'content_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/vanityUrlTest'
            },
            {
                dataTestId: 'content_link_mode_edit',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/edit/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_preview',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/vanityUrlTest'
            },
            {dataTestId: 'content_link_mode_live', tag: 'a', attribute: 'href', expectedURL: '/vanityUrlTest'},
            {
                dataTestId: 'content_link_language_fr',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/fr/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/vanityUrlTest?'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param2=value2'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param1=value1'
            },
            {
                dataTestId: 'action_url',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/linkedPage.myAction.do'
            },
            {
                dataTestId: 'fragment_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/en/sites/npmTestSite/home/testUrl/pagecontent/test.html.ajax'
            },
            {
                dataTestId: 'path_not_exists',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            },
            {
                dataTestId: 'no_weakref',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            }
        ]);

        // Check live workspace
        cy.visit('/sites/npmTestSite/home/testUrl.html');
        testUrl([
            {
                dataTestId: 'image_reference',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/files/live/sites/npmTestSite/files/image.jpg'
            },
            {
                dataTestId: 'image_static_resource',
                tag: 'img',
                attribute: 'src',
                expectedURL: '/modules/jahia-npm-module-example/static/images/goat.jpg'
            },
            {dataTestId: 'content_link', tag: 'a', attribute: 'href', expectedURL: '/vanityUrlTest'},
            {
                dataTestId: 'content_link_mode_edit',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/edit/default/en/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_mode_preview',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/cms/render/default/vanityUrlTest'
            },
            {dataTestId: 'content_link_mode_live', tag: 'a', attribute: 'href', expectedURL: '/vanityUrlTest'},
            {
                dataTestId: 'content_link_language_fr',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/fr/sites/npmTestSite/home/linkedPage.html'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/vanityUrlTest?'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param2=value2'
            },
            {
                dataTestId: 'content_link_parameters',
                tag: 'a',
                attribute: 'href',
                expectedURL: 'param1=value1'
            },
            {
                dataTestId: 'action_url',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/linkedPage.myAction.do'
            },
            {
                dataTestId: 'fragment_link',
                tag: 'a',
                attribute: 'href',
                expectedURL: '/sites/npmTestSite/home/testUrl/pagecontent/test.html.ajax'
            },
            {
                dataTestId: 'path_not_exists',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            },
            {
                dataTestId: 'no_weakref',
                tag: 'a',
                attribute: 'href',
                expectedURL: '#'
            }
        ]);

        cy.logout();
    });
});
