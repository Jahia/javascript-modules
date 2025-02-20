import React from "react";
import jsxRuntime from "react/jsx-runtime";
import * as lib from "@jahia/javascript-modules-library";
import * as ReactI18Next from "react-i18next";
import I18next from "i18next";
import styledJsx from "styled-jsx/style";

declare const javascriptModulesLibraryBuilder: {
  addSharedLibrary(name: string, module: unknown): void;
};

export default () => {
  javascriptModulesLibraryBuilder.addSharedLibrary("@jahia/javascript-modules-library", lib);
  javascriptModulesLibraryBuilder.addSharedLibrary("react", React);
  javascriptModulesLibraryBuilder.addSharedLibrary("react/jsx-runtime", jsxRuntime);
  javascriptModulesLibraryBuilder.addSharedLibrary("react-i18next", ReactI18Next);
  javascriptModulesLibraryBuilder.addSharedLibrary("i18next", I18next);
  javascriptModulesLibraryBuilder.addSharedLibrary("styled-jsx", styledJsx);
};
