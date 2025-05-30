import { addNode } from "@jahia/cypress";
import { addEvent, addSimplePage } from "../../utils/Utils";

describe("getNodesByJCRQuery function test", () => {
  const initEvent = (index: number) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      parentPath: "/sites/javascriptTestSite/contents/events",
      name: `event-${index}`,
      title: `Event ${index}`,
      startDate: today,
      endDate: tomorrow,
    };
  };

  before("Create test page and contents", () => {
    addSimplePage(
      "/sites/javascriptTestSite/home",
      "getNodesByJCRQuery",
      "Test getNodesByJCRQuery",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      addNode({
        parentPathOrId: "/sites/javascriptTestSite/home/getNodesByJCRQuery/pagecontent",
        name: "getNodesByJCRQuery",
        primaryNodeType: "javascriptExample:testJCRQuery",
      });

      addNode({
        parentPathOrId: "/sites/javascriptTestSite/contents",
        name: "events",
        primaryNodeType: "jnt:contentFolder",
      }).then(() => {
        addEvent("javascriptTestSite", initEvent(1));
        addEvent("javascriptTestSite", initEvent(2));
        addEvent("javascriptTestSite", initEvent(3));
        addEvent("javascriptTestSite", initEvent(4));
        addEvent("javascriptTestSite", initEvent(5));
      });
    });
  });
  [
    {
      testCase: "all",
      expected: [
        "/sites/javascriptTestSite/contents/events/event-1",
        "/sites/javascriptTestSite/contents/events/event-2",
        "/sites/javascriptTestSite/contents/events/event-3",
        "/sites/javascriptTestSite/contents/events/event-4",
        "/sites/javascriptTestSite/contents/events/event-5",
      ],
    },
    {
      testCase: "limit",
      expected: [
        "/sites/javascriptTestSite/contents/events/event-1",
        "/sites/javascriptTestSite/contents/events/event-2",
        undefined,
        undefined,
        undefined,
      ],
    },
    {
      testCase: "limitMandatory",
      expected: [undefined, undefined, undefined, undefined, undefined],
    },
    {
      testCase: "offset",
      expected: [
        "/sites/javascriptTestSite/contents/events/event-3",
        "/sites/javascriptTestSite/contents/events/event-4",
        "/sites/javascriptTestSite/contents/events/event-5",
        undefined,
        undefined,
      ],
    },
    {
      testCase: "limitOffset",
      expected: [
        "/sites/javascriptTestSite/contents/events/event-3",
        "/sites/javascriptTestSite/contents/events/event-4",
        undefined,
        undefined,
        undefined,
      ],
    },
  ].forEach((test) => {
    it(`Test getNodesByJCRQuery, case: ${test.testCase}`, function () {
      cy.login();
      cy.visit(
        "/jahia/page-composer/default/en/sites/javascriptTestSite/home/getNodesByJCRQuery.html",
      );
      cy.visit("/cms/render/default/en/sites/javascriptTestSite/home/getNodesByJCRQuery.html");

      for (let i = 0; i < test.expected.length; i++) {
        const expectedElement = test.expected[i];
        if (expectedElement) {
          cy.get(`div[data-testid="getNodesByJCRQuery_${test.testCase}_${i + 1}"]`).contains(
            expectedElement,
          );
        } else {
          cy.get(`div[data-testid="getNodesByJCRQuery_${test.testCase}_${i + 1}"]`).should(
            "not.exist",
          );
        }
      }

      cy.logout();
    });
  });
});
