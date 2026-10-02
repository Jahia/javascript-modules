#!/bin/bash
# Prepares a run where Cypress runs on the host instead of in a test image.
# Jahia boots while the modules build and the test dependencies install.
set -euo pipefail

# Provides the compose variables, SUPER_USER_PASSWORD among them
source ./set-env.sh

docker compose up -d --renew-anon-volumes jahia < /dev/null

# The build log goes to a file so it does not interleave with the yarn output
JAVA_HOME="$JAVA_HOME_17_X64" mvn -B -U -ntp -f ../pom.xml -s ../.github/maven.settings.xml clean install > artifacts/mvn.log 2>&1 &
mvn_pid=$!

CI=true yarn install --immutable
yarn cypress install

if ! wait "$mvn_pid"; then
  cat artifacts/mvn.log
  exit 1
fi
grep -A 15 'Reactor Summary' artifacts/mvn.log

# The action collects the modules before this script runs, so the fresh build is collected here
find .. -type d -name node_modules -prune -o -type f -path '*/target/*' \( -name '*-SNAPSHOT.jar' -o -name '*-SNAPSHOT.tgz' \) -print -exec cp {} artifacts/ \;
