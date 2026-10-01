#!/bin/bash
# Runs the tests on the host against the Jahia container that ci.build.bare-metal.sh started.
set -uo pipefail

export JAHIA_URL="http://localhost:8080${CONTEXT_PATH:-}"

# Not `yarn env.run`: yarn runs dependency binaries with node, and this one is a bash script
node_modules/.bin/env.run
status=$?

# TODO remove: diagnoses why Jahia fails to find its repository home on the hosted runner
if [[ $status -ne 0 ]]; then
  docker info
  docker exec jahia sh -c 'ls -laR /etc/jahia | head -60; grep -rE "jackrabbit.home|jahia.data.dir|jahiaVarDiskPath" /etc/jahia /var/jahia/info /usr/local/tomcat/conf 2>&1 | head -20'
fi

# The action reads the reports and test_success from artifacts/results/, and writes its own logs there
rm -rf artifacts/results
mkdir -p artifacts/results
cp -r results/. artifacts/results/ 2>/dev/null || true

exit $status
