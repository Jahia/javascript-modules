# jahia-module

There is a Jahia-wide convention: if `tests/` contains a `jahia-module/` directory, it is automatically provisioned to the test Jahia instance.

This directory will re-export the `package.tgz` created by `jahia-test-module` at the root of this repository.

This whole mechanic was designed to monorepo-ify [Jahia/javascript-modules](https://github.com/Jahia/javascript-modules) without changing any of the existing CI/CD pipelines. This is another concern that will be addressed separately.

As the [test `ci.build.sh` script requires](https://github.com/Jahia/jahia-cypress/blob/41f0f5ccdc7228292ec4c72fb758f7f067314486/ci.build.sh#L29), this module exposes two scripts:

- `build`: in theory, this step is supposed to transform source files into distributable files. In practice, it delegates all the work to `jahia-test-module`.
- `jahia-pack`: this step is supposed to pack the distributable files into an archive. In practice, this is a no-op as the build command already does this.

We leverage [yarn-provided environment variables](https://yarnpkg.com/advanced/lifecycle-scripts#environment-variables) to avoid hardcoding all paths.
