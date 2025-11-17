import { addNode } from "@jahia/cypress";
import { addEvent, addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("getNodesByJCRQuery function test", () => {
  const initEvent = (index: number) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      parentPath: `/sites/${GENERIC_SITE_KEY}/contents/events`,
      name: `event-${index}`,
      title: `Event ${index}`,
      startDate: today,
      endDate: tomorrow,
    };
  };

  before("Create test page and contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/getNodesByJCRQuery/pagecontent`,
        name: "getNodesByJCRQuery",
        primaryNodeType: "javascriptExample:testJCRQuery",
      });

      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/contents`,
        name: "events",
        primaryNodeType: "jnt:contentFolder",
      }).then(() => {
        addEvent(GENERIC_SITE_KEY, initEvent(1));
        addEvent(GENERIC_SITE_KEY, initEvent(2));
        addEvent(GENERIC_SITE_KEY, initEvent(3));
        addEvent(GENERIC_SITE_KEY, initEvent(4));
        addEvent(GENERIC_SITE_KEY, initEvent(5));
      });
    });
  });
  
  beforeEach("Login", () => { cy.login(); });
  afterEach("Logout", () => { cy.logout(); });

  // dynmically generated test cases
  [
    {
      testCase: "all",
      expected: [
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-1`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-2`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-3`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-4`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-5`,
      ],
    },
    {
      testCase: "limit",
      expected: [
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-1`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-2`,
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
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-3`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-4`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-5`,
        undefined,
        undefined,
      ],
    },
    {
      testCase: "limitOffset",
      expected: [
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-3`,
        `/sites/${GENERIC_SITE_KEY}/contents/events/event-4`,
        undefined,
        undefined,
        undefined,
      ],
    },
  ].forEach((test) => {
    it(`Test getNodesByJCRQuery, case: ${test.testCase}`, function () {
      cy.visit(
        `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/getNodesByJCRQuery.html`,
      );
      cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/getNodesByJCRQuery.html`);

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
    });
  });
});
