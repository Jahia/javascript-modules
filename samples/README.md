# Samples

Hydrogen is a sample project that contains a JavaScript module with a pre-configured site. It is the result of the [Getting Started tutorial](https://github.com/Jahia/javascript-modules/tree/main/docs/1-getting-started).

You can test it by following those steps:

1. Make sure you meet [the pre-requisites](https://github.com/Jahia/javascript-modules/tree/main/docs/1-getting-started/1-dev-environment#pre-requisites)
2. Start a Jahia instance using Docker:

```
docker run --name jahia-ee-dev -p 8080:8080 -p 9229:9229 -e JPDA=true -d jahia/jahia-ee:8.2
```

3. Upgrade the JavaScript Modules engine to the latest version

```
curl http://root:root1234@localhost:8080/modules/api/provisioning \
  --header 'Content-Type: application/json' \
  --data '[{"installOrUpgradeBundle":"mvn:org.jahia.modules/javascript-modules-engine","autoStart":true}]'
```

4. Navigate to the [hydrogen](./hydrogen) directory:

```
cd ./hydrogen
```

5. Install the necessary dependencies using Yarn:

```
yarn
```

6. Build and deploy the module:

```
yarn dev
```

7. Install the pre-packaged site:

```
curl -u "root:root1234" -X POST http://localhost:8080/modules/api/provisioning --form script='[{"importSite":"jar:mvn:org.jahia.samples/javascript-modules-samples-hydrogen-prepackaged/LATEST/zip!/site.zip"}]' 
```
