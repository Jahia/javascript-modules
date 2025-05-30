import { addSimplePage } from "../../utils/Utils";
import { JContent } from "@jahia/jcontent-cypress/dist/page-object/jcontent";

describe("Template Picker Correct Order Test", () => {
  before("Create page", () => {
    addSimplePage(
      "/sites/javascriptTestSite/home",
      "TemplatePickerCorrectOrderTest",
      "TemplatePickerCorrectOrderTest",
      "en",
      "simple",
      [],
      ["jmix:canBeUseAsTemplateModel"],
      [{ name: "j:pageTemplateTitle", value: "testCustom", language: "en" }],
    );
  });

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
    cy.login();
    const jContent = JContent.visit("javascriptTestSite", "en", "pages/home").switchToPageBuilder();
    jContent.getCreatePage();
    cy.get('[id="select-jmix:hasTemplateNode_j:templateName"]').click();
    let i = 0;
    cy.get('[id="select-jmix:hasTemplateNode_j:templateName"] menu li').each((el) => {
      cy.wrap(el).should("have.text", templatesValues[i]);
      i++;
    });
    cy.logout();
  });
});
