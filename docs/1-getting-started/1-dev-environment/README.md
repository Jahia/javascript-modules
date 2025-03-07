# Setting Up Your Dev Environment

## Pre-Requisites

- Node LTS https://nodejs.org/en/download + Yarn
- Docker https://docs.docker.com/get-docker/

At this time of writing here are the versions we are using:

```bash
$ node -v
v22.14.0
$ npm -v
10.9.2
$ docker -v
Docker version 27.5.1, build 9f9e405
```

## Create a New Project

`npm init`

## Project Structure

The template you just cloned contains the following files:

...

It is fully configured to work out the box with VSCode. It uses the following tools:

- ESLint
- Prettier
- Vite
- ...

## Starting Jahia

Starting Jahia in Docker

```bash
# Start Jahia
docker run --name jahia-dev -p 8080:8080 -p 9229:9229 -e JPDA=true -d jahia/jahia-ee:8.2.1

# Upgrade the JavaScript Modules engine to the latest version
curl http://root:root1234@localhost:8080/modules/api/provisioning \
  --header 'Content-Type: application/json' \
  --data '[{"installOrUpgradeBundle":"mvn:org.jahia.modules/javascript-modules-engine","autoStart":true}]'
```

To display logs in real-time you can either use the Docker Desktop app or run `docker logs -fn1 jahia-dev` in a new terminal.

_screenshot_

## First Deployment

`yarn watch`

Create a new project

_screenshot_

and voilà! ✨

Next: [Making a Hero Section](../2-making-a-hero-section/)
