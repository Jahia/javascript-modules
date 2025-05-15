import { addNode, addVanityUrl, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/Utils";

describe("Test on url helper", () => {
  before("Create test page and contents", () => {
    cy.fixture("testData/image.jpg", "binary").then((image) => {
      const blob = Cypress.Blob.binaryStringToBlob(image, "image/jpeg");
      const file = new File([blob], "image.jpg", { type: blob.type });
      cy.apollo({
        variables: {
          path: "/sites/javascriptTestSite/files",
          name: "image.jpg",
          mimeType: "image/jpeg",
          file: file,
        },
        mutationFile: "graphql/jcrUploadFile.graphql",
      });
    });
    addSimplePage("/sites/javascriptTestSite/home", "linkedPage", "linkedPage", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
    addSimplePage("/sites/javascriptTestSite/home", "testUrl", "testUrl", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: "/sites/javascriptTestSite/home/testUrl/pagecontent",
        name: "test",
        primaryNodeType: "javascriptExample:testUrl",
        properties: [
          {
            name: "linknode",
            value: "/sites/javascriptTestSite/home/linkedPage",
            type: "WEAKREFERENCE",
            language: "en",
          },
          {
            name: "image",
            value: "/sites/javascriptTestSite/files/image.jpg",
            type: "WEAKREFERENCE",
          },
        ],
      });
    });

    publishAndWaitJobEnding("/sites/javascriptTestSite");
  });

  after("Clean", () => {
    deleteNode("/sites/javascriptTestSite/files/image.jpg");
    deleteNode("/sites/javascriptTestSite/home/testUrl");
    publishAndWaitJobEnding("/sites/javascriptTestSite");
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
    cy.visit("/cms/render/default/en/sites/javascriptTestSite/home/testUrl.html");

    // Check default workspace in preview
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: "/files/default/sites/javascriptTestSite/files/image.jpg",
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/edit/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/fr/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.html?",
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
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.myAction.do",
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL:
          "/cms/render/default/en/sites/javascriptTestSite/home/testUrl/pagecontent/test.html.ajax",
      },
    ]);

    // Check live workspace
    cy.visit("/sites/javascriptTestSite/home/testUrl.html");
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: "/files/live/sites/javascriptTestSite/files/image.jpg",
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/edit/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_live",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_language_fr",
        tag: "a",
        attribute: "href",
        expectedURL: "/fr/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.html?",
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
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.myAction.do",
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/testUrl/pagecontent/test.html.ajax",
      },
    ]);

    cy.logout();
  });

  it("Generated URLs should be correct with vanity", function () {
    // Add a vanity url
    addVanityUrl("/sites/javascriptTestSite/home/linkedPage", "en", "/vanityUrlTest");
    publishAndWaitJobEnding("/sites/javascriptTestSite/home/linkedPage");

    cy.login();
    cy.visit("/cms/render/default/en/sites/javascriptTestSite/home/testUrl.html");

    // Check default workspace in preview
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: "/files/default/sites/javascriptTestSite/files/image.jpg",
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "content_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/vanityUrlTest",
      },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/edit/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/vanityUrlTest",
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
        expectedURL: "/cms/render/default/fr/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_parameters",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/vanityUrlTest?",
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
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/en/sites/javascriptTestSite/home/linkedPage.myAction.do",
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL:
          "/cms/render/default/en/sites/javascriptTestSite/home/testUrl/pagecontent/test.html.ajax",
      },
    ]);

    // Check live workspace
    cy.visit("/sites/javascriptTestSite/home/testUrl.html");
    testUrl([
      {
        dataTestId: "image_reference",
        tag: "img",
        attribute: "src",
        expectedURL: "/files/live/sites/javascriptTestSite/files/image.jpg",
      },
      {
        dataTestId: "image_static_resource",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_with_module_name",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      {
        dataTestId: "image_static_resource_endpoint",
        tag: "img",
        attribute: "src",
        expectedURL: "/modules/javascript-modules-engine-test-module/static/images/goat.jpg",
      },
      { dataTestId: "content_link", tag: "a", attribute: "href", expectedURL: "/vanityUrlTest" },
      {
        dataTestId: "content_link_mode_edit",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/edit/default/en/sites/javascriptTestSite/home/linkedPage.html",
      },
      {
        dataTestId: "content_link_mode_preview",
        tag: "a",
        attribute: "href",
        expectedURL: "/cms/render/default/vanityUrlTest",
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
        expectedURL: "/fr/sites/javascriptTestSite/home/linkedPage.html",
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
        dataTestId: "action_url",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/linkedPage.myAction.do",
      },
      {
        dataTestId: "fragment_link",
        tag: "a",
        attribute: "href",
        expectedURL: "/sites/javascriptTestSite/home/testUrl/pagecontent/test.html.ajax",
      },
    ]);

    cy.logout();
  });
});
