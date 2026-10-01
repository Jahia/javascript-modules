#!/bin/bash
# Runs the tests on the host against the Jahia container that ci.build.bare-metal.sh started.
set -uo pipefail

export JAHIA_URL="http://localhost:8080${CONTEXT_PATH:-}"

yarn env.run
status=$?

# The action reads the reports and test_success from artifacts/results/
rm -rf artifacts/results
mkdir -p artifacts
cp -r results artifacts/results

exit $status
