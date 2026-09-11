import { addNode, addVanityUrl, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY, JAHIA_CONTEXT, JAHIA_ORIGIN } from "../../support/constants";

describe("Test on url helper", () => {
  before("Create test page and contents", () => {
    cy.fixture("testData/image.jpg", "binary").then((image) => {
      const blob = Cypress.Blob.binaryStringToBlob(image, "image/jpeg");
      const file = new File([blob], "image.jpg", { type: blob.type });
      cy.apollo({
        variables: {
          path: `/sites/${GENERIC_SITE_KEY}/files`,
          name: "image.jpg",
          mimeType: "image/jpeg",
          file: file,
        },
        mutationFile: "graphql/jcrUploadFile.graphql",
      });
    });
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "linkedPage", "linkedPage", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testUrl", "testUrl", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testUrl/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testUrl",
        properties: [
          {
            name: "linknode",
            value: `/sites/${GENERIC_SITE_KEY}/home/linkedPage`,
            type: "WEAKREFERENCE",
            language: "en",
          },
          {
            name: "image",
            value: `/sites/${GENERIC_SITE_KEY}/files/image.jpg`,
            type: "WEAKREFERENCE",
          },
        ],
      });
    });

    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  after("Clean", () => {
    deleteNode(`/sites/${GENERIC_SITE_KEY}/files/image.jpg`);
    deleteNode(`/sites/${GENERIC_SITE_KEY}/home/testUrl`);
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  const testUrl = (urls) => {
    for (const url of urls) {
      if (url.expectedURL) {
        cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`)
          .should("have.attr", url.attribute)
          .should("include", url.expectedURL);
      } else if (url.attributeShouldNotExists) {
        cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`).should(
          "not.have.attr",
          url.attribute,
        );
      } else {
        cy.get(`div[data-testid="${url.dataTestId}"] ${url.tag}`).should(
          "have.attr",
          url.attribute,
          "",
        );
      }
    }
  };

  it("Generated URLs should be correct", function () {
    cy.login();
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrl.html`);

    // Check default workspace in preview
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/files/default/sites/${GENERIC_SITE_KEY}/files/image.jpg`,
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_base64",
        tag: "img",
        attribute: "src",
        expectedURL: "data:image/png;base64,",
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/edit/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html?`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param2=value2",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param1=value1",
      },
      {
        dataTestId: "content_link_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_absolute_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/cms/render/default/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "image_static_resource_absolute",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "endpoint_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/graphql`,
      },
      {
        dataTestId: "endpoint_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/graphql`,
      },
      // An origin must not be prefixed onto a URL that already carries one, as an external
      // provider's does. Regression guard: buildNodeUrl once returned `<server><dam url>`.
      {
        dataTestId: "external_provider_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: "https://media.keepeek.test/asset/1234.jpg",
      },
      {
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.myAction.do`,
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrl/pagecontent/test.html.ajax`,
      },
    ]);

    // Check live workspace
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testUrl.html`);
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/files/live/sites/${GENERIC_SITE_KEY}/files/image.jpg`,
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/edit/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html?`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param2=value2",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param1=value1",
      },
      {
        dataTestId: "content_link_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_absolute_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "image_static_resource_absolute",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "endpoint_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/graphql`,
      },
      {
        dataTestId: "endpoint_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/graphql`,
      },
      // An origin must not be prefixed onto a URL that already carries one, as an external
      // provider's does. Regression guard: buildNodeUrl once returned `<server><dam url>`.
      {
        dataTestId: "external_provider_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: "https://media.keepeek.test/asset/1234.jpg",
      },
      {
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.myAction.do`,
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/testUrl/pagecontent/test.html.ajax`,
      },
    ]);

    cy.logout();
  });

  it("Generated URLs should be correct with vanity", function () {
    // Add a vanity url
    addVanityUrl(`/sites/${GENERIC_SITE_KEY}/home/linkedPage`, "en", "/vanityUrlTest");
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/linkedPage`);

    cy.login();
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrl.html`);

    // Check default workspace in preview
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/files/default/sites/${GENERIC_SITE_KEY}/files/image.jpg`,
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/edit/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: "/vanityUrlTest",
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest?`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param2=value2",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param1=value1",
      },
      {
        dataTestId: "content_link_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_absolute_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/cms/render/default/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "image_static_resource_absolute",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "endpoint_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/graphql`,
      },
      {
        dataTestId: "endpoint_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/graphql`,
      },
      // An origin must not be prefixed onto a URL that already carries one, as an external
      // provider's does. Regression guard: buildNodeUrl once returned `<server><dam url>`.
      {
        dataTestId: "external_provider_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: "https://media.keepeek.test/asset/1234.jpg",
      },
      {
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.myAction.do`,
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrl/pagecontent/test.html.ajax`,
      },
    ]);

    // Check live workspace
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testUrl.html`);
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/files/live/sites/${GENERIC_SITE_KEY}/files/image.jpg`,
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/vanityUrlTest",
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/edit/default/en/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/cms/render/default/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: "/vanityUrlTest",
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "/vanityUrlTest?",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param2=value2",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "param1=value1",
      },
      {
        dataTestId: "content_link_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/vanityUrlTest`,
      },
      {
        dataTestId: "content_link_absolute_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/fr/sites/${GENERIC_SITE_KEY}/home/linkedPage.html`,
      },
      {
        dataTestId: "image_static_resource_absolute",
        tag: "img",
        attribute: "src",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/modules/javascript-modules-engine-test-module/static/images/goat.jpg`,
      },
      {
        dataTestId: "endpoint_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/graphql`,
      },
      {
        dataTestId: "endpoint_absolute_origin",
        tag: "a",
        attribute: "href",
        expectedURL: `https://origin.test${JAHIA_CONTEXT}/graphql`,
      },
      // An origin must not be prefixed onto a URL that already carries one, as an external
      // provider's does. Regression guard: buildNodeUrl once returned `<server><dam url>`.
      {
        dataTestId: "external_provider_absolute",
        tag: "a",
        attribute: "href",
        expectedURL: "https://media.keepeek.test/asset/1234.jpg",
      },
      {
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/linkedPage.myAction.do`,
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: `${JAHIA_CONTEXT}/sites/${GENERIC_SITE_KEY}/home/testUrl/pagecontent/test.html.ajax`,
      },
    ]);

    cy.logout();
  });
});
