#!/bin/bash
# This script should fail on any error
set -e
# Directory containing the TypeScript definition files
DIR="target/java-ts-bind/types"

# Define arrays for search and replace pairs
searches=(
    "ServiceReference\\[\\]"
    "Map\\[\\]"
    ".*org\\.graalvm\\.polyglot.*;"
    "loadPropertiesResource(bundle: Bundle, path: string): ProxyObject;"
    "transformToJsNode(node: JCRNodeWrapper, includeChildren: boolean, includeDescendants: boolean, includeAllTranslations: boolean): ProxyObject;"
    "getRenderParameters(resource: Resource): ProxyObject;"
    "getConfigPids(): ProxyArray;"
    "getConfigFactoryIdentifiers(factoryPid: string): ProxyArray;"
    "getConfigValues(configPid: string): ProxyObject;"
    "getConfigFactoryValues(factoryPid: string, factoryIdentifier: string): ProxyObject;"
    "export class JCRSiteNode {"
    "renderComponent(attr: Map<string, any>, renderContext: RenderContext): string;"
    "render(attr: Map<string, any>, renderContext: RenderContext, currentResource: Resource): string;"
    "addResources(attr: Map<string, any>, renderContext: RenderContext): string;"
    "addCacheDependency(attr: Map<string, any>, renderContext: RenderContext): void;"
    "renderAbsoluteArea(attr: Map<string, any>, renderContext: RenderContext): string;"
    "renderArea(attr: Map<string, any>, renderContext: RenderContext): string;"
    "find(filter: Map<string, any>): any\\[\\];"
    "find(filter: Map<string, any>, orderBy: string): any\\[\\];"
)

replaces=(
    "ServiceReference<any>[]"
    "any[]"
    ""
    "loadPropertiesResource(bundle: Bundle, path: string): any;"
    "transformToJsNode(node: JCRNodeWrapper, includeChildren: boolean, includeDescendants: boolean, includeAllTranslations: boolean): any;"
    "getRenderParameters(resource: Resource): any;"
    "getConfigPids(): string[];"
    "getConfigFactoryIdentifiers(factoryPid: string): string[];"
    "getConfigValues(configPid: string): any;"
    "getConfigFactoryValues(factoryPid: string, factoryIdentifier: string): any;"
    "export interface JCRSiteNode extends JCRNodeWrapper {"
    "renderComponent(attr: any, renderContext: RenderContext): string;"
    "render(attr: any, renderContext: RenderContext, currentResource: Resource): string;"
    "addResources(attr: any, renderContext: RenderContext): string;"
    "addCacheDependency(attr: any, renderContext: RenderContext): void;"
    "renderAbsoluteArea(attr: any, renderContext: RenderContext): string;"
    "renderArea(attr: any, renderContext: RenderContext): string;"
    "find(filter: any): any[];"
    "find(filter: any, orderBy: string): any[];"
)

# Iterate over the arrays and perform the replacements
# A search that matches no file is an error: the declaration it was written for has changed
# name or shape, so the patch silently stops being applied and the generated types drift.
# grep runs with basic regular expressions, the same dialect as the sed calls below.
unmatched=()
for i in "${!searches[@]}"; do
  if ! grep -rl --include="*.d.ts" "${searches[$i]}" $DIR > /dev/null; then
    unmatched+=("${searches[$i]}")
    continue
  fi
  if [[ "$OSTYPE" == "darwin"* ]]; then
     find $DIR -name "*.d.ts" -exec sed -i '' -e "s/${searches[$i]}/${replaces[$i]}/g" {} \;
  else
     find $DIR -name "*.d.ts" -exec sed -i -e "s/${searches[$i]}/${replaces[$i]}/g" {} \;
  fi
done

if [ ${#unmatched[@]} -ne 0 ]; then
  echo "apply-patch.sh: no generated .d.ts file matches these search patterns:" >&2
  printf '  %s\n' "${unmatched[@]}" >&2
  echo "Fix each pattern to match the current output, or remove the obsolete entry and its replacement." >&2
  exit 1
fi
