# Javascript Module template create-module project

This project provides an Javascript module starter project template to quickly get up and running to create Jahia Javascript modules

## Usage

    npx @jahia/create-module@latest project-name [module-type] [namespace-definitions]

where 
- `project-name` (mandatory) can be anything you want to call your project
- `module-type` (optional) Can be one of:
  - `templatesSet`: A collection of templates and components. A template set is required when creating a website.
  - `module`: Standard Jahia module. This is the default value.
  - `system`: Critical module for the whole platform.
- `namespace-definitions` (optional) The namespace used for content definitions. Default is the project name in camel case.
