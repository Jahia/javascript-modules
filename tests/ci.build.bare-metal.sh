#!/bin/bash
# Prepares a run where Cypress runs on the host instead of in a test image.
# Jahia boots in the background while the test dependencies install.
set -euo pipefail

# Provides the compose variables, SUPER_USER_PASSWORD among them
source ./set-env.sh

docker compose up -d --renew-anon-volumes jahia < /dev/null

CI=true yarn install --immutable
yarn cypress install
