#!/bin/bash
# Prepares a run where Cypress runs on the host instead of in a test image.
# Jahia and the module build were started by ci.prestart.bare-metal.sh.
set -euo pipefail

CI=true yarn install --immutable
yarn cypress install

until [[ -e artifacts/mvn.status ]]; do sleep 1; done
if [[ "$(cat artifacts/mvn.status)" != 0 ]]; then
  cat artifacts/mvn.log
  exit 1
fi
grep -A 15 'Reactor Summary' artifacts/mvn.log

# The action collects the modules before this script runs, so the fresh build is collected here
find .. -type d -name node_modules -prune -o -type f -path '*/target/*' \( -name '*-SNAPSHOT.jar' -o -name '*-SNAPSHOT.tgz' \) -print -exec cp {} artifacts/ \;

# The action runs the startup script whatever this script returns
touch artifacts/build-ok
