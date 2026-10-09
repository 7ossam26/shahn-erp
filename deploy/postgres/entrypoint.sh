#!/bin/sh
set -eu
# Compose bind-backed secrets may retain host ownership/mode. Copy under the data owner's identity.
if [ -f /run/secrets/backup_config ]; then
  install -d -o postgres -g postgres -m 700 /etc/shahn-secrets
  for name in backup_config runtime_password migration_password backup_password; do
    install -o postgres -g postgres -m 600 "/run/secrets/$name" "/etc/shahn-secrets/$name"
  done
fi
exec /usr/local/bin/docker-entrypoint.sh "$@"
