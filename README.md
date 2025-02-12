<a href="https://www.jahia.com/">
    <img src="https://www.jahia.com/modules/jahiacom-templates/images/jahia-3x.png" alt="Jahia logo" title="Jahia" style="float: right; background-color: white" height="60" />
</a>

# Javascript Modules

This project is designed to support Javascript developers working with _Jahia_. It consists of two components:
- [javascript-modules-engine](javascript-modules-engine/): a Java OSGi Bundle deployed on a _Jahia_ instance that enables the deployment and execution of Javascript modules.
- [javascript-modules-library](javascript-modules-library/): a NPM package that provides TypeScript typings (.d.ts files) for the backend methods exposed by the Java OSGi bundle, along with some utility/helper code.
By using this project, you can seamlessly integrate and manage Javascript modules within a _Jahia_ environment.

Under the hood, this project used [GraalJS](https://www.graalvm.org/latest/reference-manual/js/) (to run Javascript in a Java application) and includes a React (19.x) environment.


## Build

This project is a Maven multi-module project. The JavaScript module is built by Maven, which delegates the actual build process to Yarn (Maven is used as a wrapper).

Therefore, to build both the backend engine and the javascript library, you simply need to run:
```
mvn clean verify
```

## Open-Source

This is an Open-Source module, you can find more details about Open-Source @ Jahia [in this repository](https://github.com/Jahia/open-source)
