import { JContent } from "@jahia/jcontent-cypress/dist/page-object/jcontent";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Template Picker Correct Order Test", () => {
  before("Create page", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "TemplatePickerCorrectOrderTest",
      "TemplatePickerCorrectOrderTest",
      "en",
      "simple",
      [],
      ["jmix:canBeUseAsTemplateModel"],
      [{ name: "j:pageTemplateTitle", value: "testCustom", language: "en" }],
    );
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("should display the correct order of templates", () => {
    const templatesValues = [
      "===== TEMPLATES =====",
      "Bound component page",
      "Events page",
      "Home page",
      "Home page with hydrated menu",
      "Simple page",
      "Template example priority -5",
      "Template example priority -5",
      "Template example priority -8",
      "Template example priority -8",
      "Template example priority -999",
      "Template example priority 15",
      "Template example priority 3",
      "Template example priority 9",
      "===== PAGE MODELS =====",
      " testCustom",
    ];
    const jContent = JContent.visit("javascriptTestSite", "en", "pages/home").switchToPageBuilder();
    jContent.getCreatePage();
    cy.get('[id="select-jmix:hasTemplateNode_j:templateName"]').click();
    let i = 0;
    cy.get('[id="select-jmix:hasTemplateNode_j:templateName"] menu li').each((el) => {
      cy.wrap(el).should("have.text", templatesValues[i]);
      i++;
    });
  });
});
