#!/usr/bin/env node

// Usage: npx @jahia/create-module@latest module-name [namespace]

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {replaceInFileSync} from 'replace-in-file';
import camelCase from 'camelcase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Show help if no argment is provided
// eslint-disable-next-line no-unused-vars
const [nodeCommand, npxCommand, projectName, moduleType = 'module', namespace = camelCase(projectName || '')] = process.argv;

if (!projectName) {
    console.log(`\x1B[1m## Usage\x1B[0m

    npx @jahia/create-module@latest project-name [module-type] [namespace-definitions]

where 
- \x1B[1mproject-name\x1B[0m (mandatory) can be anything you want to call your project
- \x1B[1mmodule-type\x1B[0m (optional) Can be one of:
  - \x1B[3mtemplatesSet\x1B[0m A collection of templates and components. A template set is required when creating a website.
  - \x1B[3mmodule\x1B[0m sStandard Jahia module. This is the default value. 
  - \x1B[3msystem\x1B[0m Critical module for the whole platform . 
- \x1B[1mnamespace-definitions\x1B[0m (optional) The namespace used for content definitions. Default is the project name in camel case.
`);
    process.exit(9);
}

// First let's do some version checks
console.log('Node version detected:', process.versions.node);

// Create a project directory with the project name.
const currentDir = process.cwd();
const projectDir = path.resolve(currentDir, projectName);
fs.mkdirSync(projectDir, {recursive: true});

console.log(`Creating a new Jahia module project \x1B[1m${projectName}\x1B[0m of type \x1B[1m${moduleType}\x1B[0m and definitions namespace \x1B[1m${namespace}\x1B[0m`);

// A common approach to building a starter template is to
// create a `template` folder which will house the template
// and the files we want to create.
const templateDir = path.resolve(__dirname, 'template');
const isTemplatesSet = moduleType === 'templatesSet';
fs.cpSync(templateDir, projectDir, {
    recursive: true,
    filter: src => {
        // The file template-thumbnail.png is only used for the type templatesSet
        return (isTemplatesSet || src !== path.join(templateDir, 'settings', 'template-thumbnail.png'));
    }
});

// Find and replace all markers with the appropriate substitution values
// Doing it before renaming the dotfiles so they are not excluded
const targetFiles = `${projectDir}/**`;

try {
    replaceInFileSync({
        files: targetFiles,
        from: /\$\$MODULE_TYPE\$\$/g,
        to: moduleType
    });

    replaceInFileSync({
        files: targetFiles,
        from: /\$\$MODULE_NAME\$\$/g,
        to: projectName
    });

    replaceInFileSync({
        files: targetFiles,
        from: /\$\$MODULE_NAMESPACE\$\$/g,
        to: namespace
    });
} catch (error) {
    console.error('Error occurred:', error);
}

// It is good practice to have dotfiles stored in the
// template without the dot (so they do not get picked
// up by the starter template repository). We can rename
// the dotfiles after we have copied them over to the
// new project directory.
fs.renameSync(
    path.join(projectDir, 'dotgitignore'),
    path.join(projectDir, '.gitignore')
);
fs.renameSync(
    path.join(projectDir, 'dotnpmignore'),
    path.join(projectDir, '.npmignore')
);
fs.renameSync(
    path.join(projectDir, 'dotenv'),
    path.join(projectDir, '.env')
);
fs.renameSync(
    path.join(projectDir, 'doteslintrc.cjs'),
    path.join(projectDir, '.eslintrc.cjs')
);

// Rename the resource file to use the project name
fs.renameSync(
    path.join(projectDir, 'settings', 'resources', 'MODULE_NAME.properties'),
    path.join(projectDir, 'settings', 'resources', projectName + '.properties')
);

fs.renameSync(
    path.join(projectDir, 'settings', 'resources', 'MODULE_NAME_fr.properties'),
    path.join(projectDir, 'settings', 'resources', projectName + '_fr.properties')
);

fs.renameSync(
    path.join(projectDir, 'settings', 'content-types-icons', 'MODULE_NAMESPACE_simpleContent.png'),
    path.join(projectDir, 'settings', 'content-types-icons', namespace + '_simpleContent.png')
);

// Create empty directories for static resources and configurations
fs.mkdirSync(path.join(projectDir, 'static', 'css'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'static', 'images'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'static', 'javascript'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'settings', 'configurations'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'settings', 'content-editor-forms'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'settings', 'content-editor-forms', 'forms'), {recursive: true});
fs.mkdirSync(path.join(projectDir, 'settings', 'content-editor-forms', 'fieldsets'), {recursive: true});

// Add an empty yarn.lock in case any parent folder is using yarn
fs.writeFileSync(path.join(projectDir, 'yarn.lock'), '', 'utf8');

console.log(`Created \x1B[1m${projectName}\x1B[0m at \x1B[1m${projectDir}\x1B[0m`);
console.log('Success! Your new project is ready.');
console.log('You can now change into your project and launch "yarn" to install everything to get started.');
console.log('---');
console.log('Available project scripts will then be :');
console.log('  - yarn build : build the project');
console.log('  - yarn deploy : deploy the project. Make sure you have updated the .env file to match your setup if needed.');
console.log('  - yarn watch : will build and watch for file modifications, and deploy automatically when changes are detected. Use CTRL+C to stop watching.');
console.log('  - yarn lint : use to check that your code follows the recommended syntax guidelines. Append --fix to automatically fix most problems.');
console.log('  - yarn test : to test your project. By default only performs yarn lint but you are encouraged to add your own testing system here.');
console.log('---');
console.log('You can also check the documentation available here for more details: https://academy.jahia.com/get-started/developers/templating');
