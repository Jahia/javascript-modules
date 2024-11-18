<!--
    Template for Readmes, see alternatives/examples here: https://github.com/matiassingers/awesome-readme
-->

<!--
    Badges provides a quick glance at the state of the repository and pointers to external resources.
    More can be generated from here: https://shields.io/
-->

<a href="https://www.jahia.com/">
    <img src="https://www.jahia.com/modules/jahiacom-templates/images/jahia-3x.png" alt="Jahia logo" title="Jahia" align="right" height="60" />
</a>

NPM Plugin Module Example
======================

<p align="center">A NPM-style modules example</p>

<p align="left">This modules provide an example of a NPM-styled module. 
It must be run inside a GraalVM environment in order to support Javascript language. 
NPM modules can contain templates, definitions, filter, and other jahia extensions.
</p>

## Table of content

- [Prerequisites](#prerequisites)
- [Jahia Snapshot Environtment](#jahia-snapshot-environtment)
- [Building](#building)
- [Module deployment](#module-deployment)
    - [Deploying via Module management UI](#deploying-via-module-management-ui) 
    - [Deploying via API](#deploying-via-api) 
    - [Deploying via Script InstallBundle](#deploying-via-script-installbundle) 
    - [Deploying via Fileinstall](#deploying-via-fileinstall) 
- [Activating NPM Module](#activating-npm-module)
- [Creating new NPM modules](#creating-new-npm-modules)
- [Views](#views)


## Prerequisites
 - It must be run inside a GraalVM environment in order to support Javascript language.
 - Install npm-modules-engine module
 - Have npm, node, yarn installed

## Jahia Snapshot Environtment

In order to run npm-modules at Jahia, we need to start an environment with GraalVM running.
Run the command below to start the jahia image with docker (please note that you have to be logged in to be able to pull this image)

```shell
docker run -p 8080:8080 -p 8000:8000 -p 8101:8101 jahia/jahia-ee-dev:8.0.3.0-SNAPSHOT-graalvm
```

You need at least 4Gb allocated in your docker engine to be able to start.

## Building

Installing module dependencies:
```shell
yarn
```

Build the module using:
```shell
yarn build
```

Packing the module (It will generate jahia-npm-module-example-v1.0.0.tgz in the root of you project) :
```shell
yarn pack
```

## Module deployment

NPM modules can be installed in different ways being the most indicated via Module management UI
Below are all the possible ways to install a npm module:


### Deploying via Module management UI

In Administration - Modules
<img width="1792" alt="Screen Shot 2021-05-14 at 2 51 42 PM" src="https://user-images.githubusercontent.com/4117549/118316108-6a016c80-b4c4-11eb-8539-66da2a43a1a8.png">
<img width="1792" alt="Screen Shot 2021-05-14 at 2 51 57 PM" src="https://user-images.githubusercontent.com/4117549/118316124-6cfc5d00-b4c4-11eb-9f70-93d58ce246ef.png">
<img width="1792" alt="Screen Shot 2021-05-14 at 2 52 38 PM" src="https://user-images.githubusercontent.com/4117549/118316133-6f5eb700-b4c4-11eb-949d-c7ac5f305e02.png">



### Deploying via API

- Ensure you replace the X's in the version number of the bundle with the version number of the `.tgz` file that was created

```shell
curl -s --user root:root1234 --form bundle=@jahia-npm-module-example-vX.X.X.tgz --form start=true http://localhost:8080/modules/api/bundles
```

### Deploying via Script InstallBundle

- Create a .env file with info below in your project root folder

```yaml
JAHIA_USER=root:root1234
JAHIA_HOST=http://localhost:8080
```

run the command:
```shell
yarn deploy
```

### Deploying via Fileinstall 
(filewatcher listening on /var/jahia/modules folder)

 - After pack your module as described above run the command below in order to copy the module to the docker image

```shell
docker cp *.tgz jahia-dev:/var/jahia/modules
```

## Activating NPM Module

In order to test the views and templates created we need to create a site with this npm module as in the example below:

<img width="1518" alt="Screenshot 2021-05-18 at 09 24 09" src="https://user-images.githubusercontent.com/729255/118614476-16429c00-b7c0-11eb-9821-b582dfcf8768.png">

## NPM plugin example content 

NPM modules must be packaged with `npm pack` and must contain a `package.json` file, containing all package information.
In addition to standard mandatory fields, the `package.json` file must contain a `jahia` section with a `server` entry. This entry points to the initialization script of the module, which will be responsible of registering the extensions.
You can specify the module type here (by default, it will be `module`). Our NPM example is a templates set, so it needs to define `"module-type": "templatesSet"`.

```json
{
  "jahia": {
    "server": "dist/main.js",
    "module-type": "templatesSet"
  }
}
```

## Import and definitions

Definitions file (`definitions.cnd`) and import (`import.xml`) are placed directly in the root folder of the module. 
They follow the same format as in a standard jahia module. 
In this example we have a few definitions, and an import file to initialize the site created with this templates set.

## Views

Views are in the `views` folder. The module define views for the `test` component, and for pages. 
Page views are different from standard Jahia modules as they are actually used as templates, meaning they will be used to display the content in full page, with its own URL.
This is specified in the properties file with `template=true`.

Standard views can only be included in other views or templates.

Handlebars templating documentation can be found [here](https://github.com/Jahia/npm-modules-engine/blob/main/handlebars.md).

You can, however, include more complex views by writing Javascript code, by following this [documentation](https://github.com/Jahia/npm-modules-engine/blob/main/README.md#views).

## Read more

More in-depth documentation of the internals of npm-modules-engine can be found in [npm-modules-engine](https://github.com/Jahia/npm-modules-engine).
