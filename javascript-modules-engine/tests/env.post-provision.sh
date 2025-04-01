#!/bin/bash
# Install the prepackaged site AFTER the artifacts are installed.

BASEDIR=$(dirname $(readlink -f $0))

source $BASEDIR/set-env.sh

echo "$(date +'%d %B %Y - %k:%M') == env.post-provision.sh =="

POST_PROVISIONING_MANIFEST="post-provisioning-manifest.yml"
echo "$(date +'%d %B %Y - %k:%M') == Executing post-provisioning manifest: ${POST_PROVISIONING_MANIFEST} =="
curl -u root:${SUPER_USER_PASSWORD} -X POST ${JAHIA_URL}/modules/api/provisioning --form script="@./${POST_PROVISIONING_MANIFEST};type=text/yaml" $(find assets -type f | sed -E 's/^(.+)$/--form file=\"@\1\"/' | xargs)
echo
if [[ $? -eq 1 ]]; then
  echo "$(date +'%d %B %Y - %k:%M') == POST PROVISIONING FAILURE - EXITING SCRIPT, NOT RUNNING THE TESTS"
  echo "failure" > ./results/test_failure
  exit 1
fi
