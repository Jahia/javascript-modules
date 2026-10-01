#!/bin/bash
# Runs the tests on the host against the Jahia container that ci.build.bare-metal.sh started.
set -uo pipefail

# Not `yarn env.run`: yarn runs dependency binaries with node, and this one is a bash script
node_modules/.bin/env.run
status=$?

# The action reads the reports and test_success from artifacts/results/, and writes its own logs there
rm -rf artifacts/results
mkdir -p artifacts/results
cp -r results/. artifacts/results/ 2>/dev/null || true

exit $status
