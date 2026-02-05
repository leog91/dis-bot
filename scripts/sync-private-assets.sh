#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ASSETS_PRIVATE_DIR:-}" ]]; then
  echo "ASSETS_PRIVATE_DIR is not set."
  echo "Example: ASSETS_PRIVATE_DIR=/home/leog/repo/dis-bot-assets-private"
  exit 1
fi

if [[ ! -d "${ASSETS_PRIVATE_DIR}" ]]; then
  echo "ASSETS_PRIVATE_DIR does not exist: ${ASSETS_PRIVATE_DIR}"
  exit 1
fi

if [[ ! -d "${ASSETS_PRIVATE_DIR}/.git" ]]; then
  echo "ASSETS_PRIVATE_DIR is not a git repo: ${ASSETS_PRIVATE_DIR}"
  exit 1
fi

echo "Syncing private assets repo in: ${ASSETS_PRIVATE_DIR}"
git -C "${ASSETS_PRIVATE_DIR}" pull --ff-only
