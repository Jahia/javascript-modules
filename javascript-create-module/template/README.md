# $$MODULE_NAME$$

A simple Jahia Javascript module created using the Javascript module starter project template

## Configuration

If you don't use default configuration for the Docker container name or for Jahia deployments, please modify the provided `.env` file

## Documentation

You can find the documentation on how to use this module on the [Jahia Academy](https://academy.jahia.com/get-started/developers/templating) templating tutorial.

## Prerequisites

Yarn is required to build the project.

Please follow the instructions at [Node.js Downloads](https://nodejs.org/en/download) to install Node.js and Yarn. In the dropdown menus, make sure to select Yarn (the _with_) and your operating system (the _for_).

## Development

1. To compile and package the project:
```
yarn build
```

2. To deploy the generated package to your Jahia instance (configured in your [`.env`](.env)):
```
yarn deploy
```

3. Alternatively, to deploy during development using watch mode:
```
yarn watch
```
