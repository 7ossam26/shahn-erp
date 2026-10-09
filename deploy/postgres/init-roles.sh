#!/bin/sh
set -eu
export RUNTIME_PASSWORD="$(cat /etc/shahn-secrets/runtime_password)"
export MIGRATION_PASSWORD="$(cat /etc/shahn-secrets/migration_password)"
export BACKUP_PASSWORD="$(cat /etc/shahn-secrets/backup_password)"
psql --username postgres --dbname shahn_erp --set ON_ERROR_STOP=1 <<'SQL'
\getenv runtime_password RUNTIME_PASSWORD
\getenv migration_password MIGRATION_PASSWORD
\getenv backup_password BACKUP_PASSWORD
CREATE ROLE shahn_runtime LOGIN PASSWORD :'runtime_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE shahn_migration LOGIN PASSWORD :'migration_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE shahn_backup LOGIN PASSWORD :'backup_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE shahn_erp TO shahn_runtime, shahn_migration, shahn_backup;
GRANT CREATE ON DATABASE shahn_erp TO shahn_migration;
GRANT USAGE ON SCHEMA public TO shahn_runtime;
GRANT CREATE ON SCHEMA public TO shahn_migration;
GRANT pg_read_all_settings, pg_read_all_stats TO shahn_backup;
GRANT EXECUTE ON FUNCTION pg_backup_start(text,boolean), pg_backup_stop(boolean), pg_switch_wal(), pg_create_restore_point(text) TO shahn_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE shahn_migration GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shahn_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE shahn_migration GRANT USAGE, SELECT ON SEQUENCES TO shahn_runtime;
SQL
unset RUNTIME_PASSWORD MIGRATION_PASSWORD BACKUP_PASSWORD
# The temporary init server started with archiving off. Only the final server reads these settings.
cat >> "$PGDATA/postgresql.auto.conf" <<'CONF'
archive_mode = 'on'
archive_timeout = '60s'
archive_command = 'pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp archive-push %p'
CONF
