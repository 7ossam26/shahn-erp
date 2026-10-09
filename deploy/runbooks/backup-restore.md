# Encrypted backup, failure and isolated restore

Use the pinned pgBackRest image and `pgbackrest.conf.example`, with the actual cipher key supplied from an independent restricted recovery source. Keep issuer realm/client configuration, session/callback keys and deployment/config versions outside the data repository. A key reference is not a backup of the key. Give operators a tested separate recovery procedure; never print credentials in routine logs.

Initialize the stanza only after the actual database and private repository are ready. PostgreSQL archive_mode and archive_command are set by the database image; archive_timeout60seconds encourages idle WAL rotation. Before the first backup verify stanza/check and role privileges. Schedule the versioned `backup.cron`: weekly full, daily differential, continuous WAL. Time retention is30days; the backup/WAL chain required by retained backups must remain intact. Do not shorten archive retention independently. A new30-day setting does not prove30days of actual retained history.

```sh
pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp stanza-create
pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp check
pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp --type=full backup
pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp --type=diff backup
pgbackrest --config=/etc/shahn-secrets/backup_config --stanza=erp --output=json info
```

Run under the PostgreSQL OS data owner with the dedicated SQL backup role. SQL password access and repository credentials must follow the selected host's restricted secret/pgpass mechanism. The local rehearsal uses isolated trusted Unix sockets; it does not certify offsite permissions or deployed authentication policy. A copied live Docker volume is not a backup substitute.

Poll `deploy/monitor.mjs` with a read-only monitoring DSN every minute. Missing/stale (>300seconds) archives, failed polls or a failure newer than the last archive require operator review. Alerts retain the last archive observation and the last *independently verified* recovered checkpoint. Neither upload completion nor archive timestamp proves the latest recoverable transaction. Investigate disk/credentials/repository access, preserve the queue/WAL, restore archiving, then verify repository retrieval/decryption and chain continuity before clearing the alert. Link this runbook in the alert destination.

## Guarded rehearsal

The actual test script refuses any environment except Linux `APP_ENV=test`, `P25_ISOLATED_REHEARSAL=true` and the named `shahn-p25-postgres` test image. It uses newly named P25-labelled containers/an internal network, generated credentials, private scratch and a separate restored volume. It checks labels before stopping its own containers. It retains its encrypted test repository/keys privately for review; these are not offsite recovery sources.

Run from the Linux verification image with its Docker socket and the host `/var/lib/shahn-p25-rehearsals` mounted at the same path, so sibling container volume paths refer to the same isolated scratch. Bind only test loopback ports. Never pass a production DSN; the script generates its own database credentials.

```sh
APP_ENV=test P25_ISOLATED_REHEARSAL=true P25_POSTGRES_IMAGE=shahn-p25-postgres \
  node --import tsx scripts/verification/p25-backup.ts
```

The script migrates a dedicated native ERP test database and uses P24's actual native finance/storage/payroll/custody fixtures. Those fixtures have a narrower simulated-source boundary: they do not prove actual public Tawsel recovery. It takes a full backup, records another expense, takes a differential, captures native checkpoint hashes, creates a named WAL restore point, then deliberately commits a later2300minor cash withdrawal through the finance service. An independent pgBackRest restore to the earlier named point must reproduce the checkpoint and omit that withdrawal. It tests wrong-key rejection and an actual archive_command failure/alert. It emits versioned JSON even on failure; preserve every failed attempt before a rerun.

## Operator restore and financial reopening

1. Stop admissions/disbursements/outbound workers. Record last known recovered transaction, backup labels/WAL chain, release/schema/config/baseline identity and the uncertain interval. Set `OPERATIONS_MODE=restore`; no browser action can release it.
2. Restore into a distinct isolated database/network with distinct credentials. Mount the repository and recovery key only into the restore tool. Use explicit PITR target/time/restore point and test compatible software; never replace the live database silently.
3. Rotate restored runtime/migration/backup credentials in isolation; review session/signing/issuer recovery sources independently. The data restore cannot restore a missing identity realm/client or signing key.
4. Compare checkpoint journal totals, account funds/transit, eligible/pending/held wallets, storage credit, payroll obligations, stock/reservations/custody, native command/source identities and inbox/outbox cursors. Verify retained native result lookup returns the original result without another effect.
5. Required pending implementation: provide and test a separately controlled isolated reconciliation procedure. Current restore mode blocks callback POSTs, recovery-worker claims and all new native commands. Merely leaving it enabled cannot run P22 replay/application or typed P21 settlement. Do not switch the normal API/worker deployment to normal mode to bypass this guard. Only after an isolated reconciliation path is reviewed, scoped to test callback/public identities and tested may permitted P22 reads/replay run with original action identities. Keep production outbound and consequential UI commands disabled. Do not replay a cash payout from a delivery event or infer a receipt from offered goods.
6. List every ERP-only movement after the restored point as lost/uncertain. Require bank/cash/employee/storage/physical evidence and the appropriate typed P21 reconciliation before reopening disbursement. Passing database constraints is insufficient. The deliberate test withdrawal must remain absent; Tawsel cannot reconstruct it.
7. Record elapsed restore time, last verified record, unrecovered interval, actual source replay/cursor results, human reviewer and unresolved decisions. Then the company operator may approve a separately reviewed configuration deployment to normal mode. Preserve that decision/evidence; no automatic enable/release endpoint exists.

## Key rotation and offsite acceptance

For a new encryption key use a separately named encrypted repository, take and restore a new full backup, then transition scheduling/archive destinations deliberately. Keep the prior key independently recoverable while any old backup/WAL chain is retained; deleting its key destroys recoverability. Test source retrieval and wrong-key refusal. Do not change a populated repository's cipher-pass in place.

Offsite bucket credentials, object/WAL retrieval/decryption, actual provider bandwidth, retention/immutability policy and separate failure-domain availability remain mandatory provider acceptance. This local POSIX rehearsal certifies none of them. Production credentials/traffic/DNS/cutover are not touched by P25.
