While Java is known for being a very strict language, there are no strict rules regarding code formatting. Unfortunately, there is no complete solution in the Java ecosystem that provides an advanced formatter meeting all of the following requirements:
- IDE-agnostic (IntelliJ, VS Code, etc.)
- Available via command line (so it can be used in CI)
- Fast (i.e., no need to run a full Maven command just to format a file)
- Consistent (there should be only one way to format a given piece of code)
- Configurable (to adapt to our current rules)

## TL;DR
We have to compromise on these criteria. What can be done is to use a mix of IntelliJ built-in code style settings with a basic command-line linter (Checkstyle) for CI and other IDEs.
See https://github.com/Jahia/javascript-modules/pull/475 for an example.

_Note: Checkstyle is not a formatter, so it cannot auto-fix code style issues, but it can be used in CI to prevent the risk of "format drift" if only using IDE settings without CI enforcement (as we do today)._

### Details
Use the dbelyaev/action-checkstyle GitHub action in our existing Static Analysis action used by our repositories.
This will run Checkstyle on changes in our PRs.
IntelliJ configuration must be updated to match the Checkstyle settings.

### Plan
1. Add a new optional GitHub token parameter to Static Analysis to maintain backward compatibility.
2. Only run dbelyaev/action-checkstyle if the token is set.
3. Gradually update our repositories to pass the new GitHub token parameter in their workflows.
4. At this point, the action only reports warnings. When we're comfortable with it:
5. Make the action-checkstyle mandatory in the action and release a new v3 of jahia/jahia-modules-action/static-analysis (this is a breaking change).
6. Update the repositories to use it.

In parallel, we could add the Maven Checkstyle Plugin to the parent POM and bind the `check` goal to the `validate` phase, so that a Maven build will always validate Checkstyle.

### Summary
Pros:
- No real change for most Java developers who use IntelliJ.
Cons:
- Results might differ between IntelliJ and VS Code + Checkstyle.
- The existing IntelliJ configuration must be adapted to be "Checkstyle compliant".

## Other options considered
1. Only rely on IntelliJ code style configuration.

**Pros**: Seamless for IntelliJ users, highly customizable.
**Cons**: Not easily portable to other IDEs or CI; risk of drift if not enforced elsewhere.

2. EditorConfig
**Pros**: Simple, cross-editor support for basic rules.
**Cons**: Limited to whitespace/indentation, not full Java formatting.

3. Prettier Java
**Pros**: Familiar for teams using Prettier in JS/TS.
**Cons**: Requires Node.js, not as feature-rich for Java, limited IDE integration.

4. Spring Java Format
**Pros**: Enforces Spring’s standards.
**Cons**: Not configurable, only for Spring projects.

5. Palantir
**Pros**: Used in some large organizations.
**Cons**: No CLI, ethical concerns.

6. Google Java Format
**Pros**: Consistent, fast, easy to run in CI.
**Cons**: Not configurable, opinionated style, not great formatting (to say the least).

7. Sonar Analysis
**Pros**: Deep static analysis, security checks.
**Cons**: Not for formatting, slow feedback from IDEs.

8. Spotless
**Pros**: Can auto-format code, integrates with Maven/Gradle, supports multiple formatters, can be run in CI.
**Cons**: Formatting options depend on the underlying formatter; not all formatters are configurable.
