# Setting Up Your Dev Environment

This tutorial will guide you through the setup of your development environment to start a local Jahia instance and create a new project. We assume you have some familiarity with JavaScript and React, if that's not the case, we recommend you to follow a few tutorials to learn the basics:

- JavaScript: [javascript.info](https://javascript.info/)
- React: [react.dev/learn](https://react.dev/learn)

## Pre-Requisites

We'll be running Jahia in a Docker container and using Node.js to build our project. Make sure you have the following installed:

- Docker: [docs.docker.com/get-docker](https://docs.docker.com/get-docker/).
- Node.js LTS: [nodejs.org/en/download](https://nodejs.org/en/download). Select **for [your platform]** and **with Yarn** instead of **with npm**. Keep the default installation method for your platform.
- A code editor: we recommend [Visual Studio Code](https://code.visualstudio.com/).

At this time of writing here are the versions we are using:

```bash
$ node -v
v22.14.0
$ docker -v
Docker version 27.5.1, build 9f9e405
```

It might work with other versions but we can't guarantee it. If you encounter any issues, please refer to the official documentation of the tools.

## Starting Jahia

This step might be a bit long because you have to download about 1 GB of data, we'll start with it and let it run in the background while we set up the rest. Make sure Docker Desktop is running and execute the following command:

```bash
# Start Jahia
docker run --name jahia-ee-dev -p 8080:8080 -p 9229:9229 -e JPDA=true -d jahia/jahia-ee:8.2

# Display logs in real-time
docker logs -fn1 jahia-ee-dev
```

This command will download the [Jahia Docker image](https://hub.docker.com/r/jahia/jahia-ee/tags) and start a new container named `jahia-ee-dev`. It will be available at [localhost:8080](http://localhost:8080). When logs stop scrolling, Jahia is ready.

## Create a New Project

You can start this part while Jahia is downloading. We'll create a new project using Jahia's [@jahia/create-module](https://www.npmjs.com/@jahia/create-module) CLI. In this tutorial, we'll create a new project named `hydrogen` for a fictional company named Hydrogen, but you are free to choose your own name.

```bash
# Create a new project in ./hydrogen
npm init @jahia/module hydrogen
```

Once your project is ready, the tool will suggest you to run a few commands to start it. You can run them all except the last one, `yarn build && yarn dev`, because Jahia is not ready yet. Please note that git commands, while optional, are strongly recommended. If `code .` doesn't work, open your code editor and open the project folder manually.

## Project Structure

The project you created has the following structure:

- `.github/`: GitHub Actions configuration, builds your module on push.
- `.idea/`: JetBrains IDE configuration.
- `.vscode/`: VSCode configuration. **Make sure to install the recommended extensions!**
- `.yarn/`, `.yarnrc.yml` and `yarn.lock`: Yarn configuration and lock file.
- `node_modules/`: Node.js dependencies.
- <mark>`settings/`: Jahia-specific settings.</mark>
  - `content-types-icons/`: Icons for content types.
  - `locales/`: Translations for your code.
  - `resources/`: Translations used in Jahia interface.
  - `definitions.cnd`: Root Compact Node Definition file.
  - `import.xml`: Defines pages and contents to create when creating a new site.
  - `template-thumbnail.png`: Thumbnail for your module.
- <mark>`src/`: Your code!</mark>
- `static/`: Static files like images, fonts, etc.
- `.env`: Environment variables used by build tools.
- `.node-version`: Node.js version to use, used by many tools including GitHub Actions.
- `.prettierginore` and `prettier.config.js`: [Prettier (code formater)](https://prettier.io/) configuration.
- `eslint.config.js`: [ESLint (code linter)](https://eslint.org/) configuration.
- `package.json`: Project manifest.
- `tsconfig.json`: [TypeScript (typed JavaScript)](https://www.typescriptlang.org/) configuration.
- `vite.config.mjs`: [Vite (JavaScript bundler)](https://vite.dev/) configuration.

We highlighted the most important folders and files, and we'll describe the content of the `src/` folder in the next sections.

You project is fully configured to work out the box with VSCode and IntelliJ. If you're not familiar with all these tools, take a few minutes to read about them. They will make your life easier.

## Creating a New Site

At this point, your Jahia instance should be up and running. You can access it at [localhost:8080](http://localhost:8080). Because the fresh Jahia instance has modules packaged with it, they might be outdated. We'll upgrade the JavaScript Modules engine to the latest version to make sure we have the latest features:

```bash
# Upgrade the JavaScript Modules engine to the latest version
curl http://root:root1234@localhost:8080/modules/api/provisioning \
  --header 'Content-Type: application/json' \
  --data '[{"installOrUpgradeBundle":"mvn:org.jahia.modules/javascript-modules-engine","autoStart":true}]'
```

<details>
<summary>For PowerShell (Windows) users</summary>

```powershell
curl http://root:root1234@localhost:8080/modules/api/provisioning `
  --header 'Content-Type: application/json' `
  --data '[{"installOrUpgradeBundle":"mvn:org.jahia.modules/javascript-modules-engine","autoStart":true}]'
```

</details>

You can now run `yarn build && yarn dev` to push your project to Jahia, and create a new website with it:

1. Open [localhost:8080](http://localhost:8080) and login with `root`: `root1234`.

2. Click My projects > **Create New** > **Create**.

   ![Jahia Homepage](homepage.png)

3. Fill the form:

   ![Site creation form](create.png)

4. Select the template set you created in the previous step.

   ![Template selection interface](select-template.png)

5. Click **Next** and **Save**.

6. Open **Page Builder** and _voilà_! ✨

   ![Page Builder interface](page-builder.png)

Congratulations! You have successfully set up your development environment and created a new project in Jahia. In the next sections, we'll start building the project.

Next: [Making a Hero Section](../2-making-a-hero-section/)
