#!/bin/bash
# Starts Jahia and the module build in the background, as early as possible in the job.
# ci.build.bare-metal.sh waits for the build.
set -euo pipefail

# Provides the compose variables, SUPER_USER_PASSWORD among them
source ./set-env.sh

docker compose up -d --renew-anon-volumes jahia < /dev/null

mkdir -p artifacts
# `package` stops before the unit tests, which the build job runs. The background process holds
# none of the step's streams, so the step ends without waiting for it
(
  set +e
  JAVA_HOME="$JAVA_HOME_17_X64" mvn -B -U -ntp -f ../pom.xml -s ../.github/maven.settings.xml clean package > artifacts/mvn.log 2>&1
  echo $? > artifacts/mvn.status
) < /dev/null > /dev/null 2>&1 &
