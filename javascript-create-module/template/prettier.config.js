/**
 * @type {import("prettier").Config}
 * @see https://prettier.io/docs/en/configuration.html
 */
export default {
  quoteProps: "consistent",
  printWidth: 100,
  plugins: ["prettier-plugin-jsdoc", "prettier-plugin-packagejson"],
};
