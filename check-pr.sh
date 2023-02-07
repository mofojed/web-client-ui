#!/usr/bin/env bash
# Checks that exactly one of the provided arguments is true
# Iterates through all environment variables with the prefix LABEL_, expecting only one to be true

set -o errexit
set -o pipefail
set -o nounset

regex="^(DH-[0-9]+): .*$"

if [[ "$1" =~ $regex ]]; then
    echo "jira_ticket=${BASH_REMATCH[1]}"
else
    echo "Failure $1"
    exit 1
fi