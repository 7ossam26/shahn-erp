import { it, expect } from 'vitest';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transaction } from '@shahn/database';
import { dispatchFixture } from '../p12/fixtures.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import type { IntegrationConnection } from '../../../apps/api/src/modules/integration/config.js';
import {
  recordProvisioningStatus,
  SourceCommandWorker,
} from '../../../apps/api/src/modules/integration/source-command.service.js';
import { sourceByCompany } from '@shahn/database';
import { createApplication } from '../../../apps/api/src/app.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { trackingDetail } from '../../../apps/api/src/modules/tracking/tracking.service.js';
import { returnCommands } from '../../../apps/api/src/modules/returns/returns.service.js';
import type { ReturnCommand, ReturnResult } from '@shahn/contracts';
import type { ReturnRequest } from '@shahn/contracts/tawsel';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { transferView } from '@shahn/database';
import type {
  GoodsTransferCommand,
  GoodsTransferResult,
  DispatchCommand,
  DispatchResult,
} from '@shahn/contracts';
// Exact retained publisher runtime, never an installed service or a shared DB.
const publisher = resolve('.tools/p27-tawsel-source');
const load = (p: string) => import(/* @vite-ignore */ pathToFileURL(resolve(publisher, p)).href);
it('native commercial work crosses independent actual Tawsel HTTP/issuer worker/signed outbox into authorized ERP application', async () => {
  const erp = await isolatedPostgres(),
    routing = await isolatedPostgres();
  let app: Awaited<ReturnType<typeof createApplication>> | undefined,
    tawsel: { close(): Promise<void> } | undefined,
    issuer: { close(): Promise<void> } | undefined;
  try {
    await migrate(erp.pool);
    const [
      { buildApp },
      { migrate: tawselMigrate },
      { issuerFixture },
      { reconcileOne },
      { PlanningService },
      { Rounds },
      { CurrentActivity },
      { Outcomes },
      { Corrections },
      { runOutboxOnce },
      { Locations },
    ] = await Promise.all(
      [
        'apps/api/src/app.ts',
        'apps/api/src/db/migrate.ts',
        'apps/api/test/support/issuer-fixture.ts',
        'apps/api/src/provisioning/worker.ts',
        'apps/api/src/planning/service.ts',
        'apps/api/src/rounds/service.ts',
        'apps/api/src/current/service.ts',
        'apps/api/src/outcomes/service.ts',
        'apps/api/src/corrections/service.ts',
        'apps/api/src/outbox/worker.ts',
        'apps/api/src/locations/service.ts',
      ].map(load),
    );
    await tawselMigrate(routing.pool);
    const identity = await issuerFixture();
    issuer = identity;
    const companyIssuer = identity.origin + '/company',
      operator = randomBytes(32).toString('hex'),
      outbox = {
        encryptionKey: randomBytes(32),
        destinations: [] as { tenantId: string; integrationId: string; url: string }[],
        keys: [] as { tenantId: string; integrationId: string; keyId: string; secret: string }[],
        testLoopback: true,
      };
    const auth = {
      origin: 'http://127.0.0.1:0',
      encryptionKey: randomBytes(32),
      issuers: {
        company: { issuer: companyIssuer, clientId: 'tawsel-web', clientSecret: 'fixture-secret' },
        personal: {
          issuer: identity.origin + '/personal',
          clientId: 'tawsel-web',
          clientSecret: 'fixture-secret',
        },
      },
      sessionSeconds: 3600,
    };
    const sender = buildApp(
      new Pool({ connectionString: routing.url }),
      auth,
      { issuer: companyIssuer, operatorToken: operator },
      outbox,
    );
    tawsel = sender;
    const remote = await sender.listen({ host: '127.0.0.1', port: 0 });
    auth.origin = remote;
    let connection: IntegrationConnection | undefined;
    const fixture = await dispatchFixture(erp.pool, 'http://127.0.0.1:5339', remote, {
      issuer: companyIssuer,
      capabilities: ['execution.own', 'correction.own'],
      clientFor: (c) => new TawselClient(c),
      configure: async (f) => {
        connection = f.connection;
        const [credentialId, secret] = f.connection.serviceBearer!.slice(4).split('.');
        identity.state.adminSubjects.set(f.admin.subject, true);
        const queued = await f.commands.execute(f.support.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'integration.queue',
          operationId: 'integration.bindSource',
          nativeId: f.company,
          expectedVersion: 0,
          payload: {
            companyCode: 'TRIAL',
            displayName: 'Isolated native business trial',
            subjectIds: [f.admin.subject],
            credentialId,
            secretHash: createHash('sha256').update(secret!).digest('hex'),
            expiresAt: f.connection.serviceExpiresAt,
            erpCompanyId: f.company,
            interopVersion: '2.0.0',
            intakeCapabilities: ['intake.prepare', 'assignment.manage'],
            monitoringCapabilities: ['monitor.read'],
            returnCapabilities: ['return.receive', 'return.dispose'],
          },
        });
        expect(
          await new SourceCommandWorker(
            erp.pool,
            f.runtime,
            (c) => new TawselClient(c),
            operator,
          ).runOne(),
        ).toBe(true);
        expect(
          (
            await erp.pool.query(
              'SELECT state FROM integration.source_command WHERE action_id=$1',
              [(queued.body as { actionId: string }).actionId],
            )
          ).rows[0].state,
        ).toBe('accepted');
        return new TawselClient(f.connection).configuration();
      },
      afterProvision: async (entity, nativeId) => {
        if (entity !== 'user') return;
        const admin = {
          verifySubject: async (subject: string) => {
            const r = await fetch(
              identity.origin + '/admin/realms/company/users/' + encodeURIComponent(subject),
              { headers: { authorization: 'Bearer fixture-admin-token' } },
            );
            const v = await r.json();
            return r.ok && v.id === subject && v.enabled === true;
          },
          revokeSessions: async (subject: string) => {
            await fetch(
              identity.origin +
                '/admin/realms/company/users/' +
                encodeURIComponent(subject) +
                '/logout',
              { method: 'POST', headers: { authorization: 'Bearer fixture-admin-token' } },
            );
          },
        };
        expect(await reconcileOne(routing.pool, companyIssuer, admin)).toBe(true);
        await transaction(erp.pool, async (c) =>
          recordProvisioningStatus(
            c,
            (await sourceByCompany(c, connection!.companyId))!,
            await new TawselClient(connection!).status('user', 'user:' + nativeId),
          ),
        );
      },
    });
    const f = fixture,
      client = new TawselClient(f.connection);
    await transaction(erp.pool, async (c) =>
      recordProvisioningStatus(
        c,
        (await sourceByCompany(c, f.company))!,
        await client.status('user', 'user:' + f.admin.id),
      ),
    );
    app = await createApplication(
      { environment: 'test', runtimeUrl: erp.url, migrationUrl: erp.url },
      f.config,
      f.runtime,
    );
    await app.listen(0, '127.0.0.1');
    const destination = (await app.getUrl()) + '/api/v1/consumer/events';
    const scope = { tenantId: f.connection.tenantId, integrationId: f.connection.integrationId };
    outbox.destinations.push({ ...scope, url: destination });
    outbox.keys.push({ ...scope, keyId: 'trial', secret: f.secret });
    const wire = (operationId: string, payload: object) => ({
      schemaVersion: '1.0.0',
      payloadVersion: '1.0.0',
      actionId: randomUUID(),
      operationId,
      context: { kind: 'integration', ...scope },
      resources: {},
      baseVersions: {},
      dependsOnActionIds: [],
      observation: { observedAt: null, clock: { quality: 'unknown' } },
      payload,
    });
    for (const [op, payload] of [
      ['integration.configureWebhook', { url: destination, enabled: true, expectedRevision: 0 }],
      ['integration.rotateSigningKey', { keyId: 'trial', overlapSeconds: 86400 }],
    ] as const) {
      const r = await fetch(remote + '/api/v1/integration/commands/' + op, {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + f.connection.serviceBearer,
          'content-type': 'application/json',
        },
        body: JSON.stringify(wire(op, payload)),
      });
      expect(r.status).toBe(200);
      expect((await r.json()).receipt.businessStatus).toBe('accepted');
    }
    const s = await f.create(),
      prepared = await f.prepared([s]);
    await f.commands.execute(
      f.admin.token,
      f.command({
        type: 'dispatch.receive',
        intentId: prepared.id,
        expectedVersion: prepared.version,
        receiptAsserted: true,
      }),
    );
    await f.completeNext();
    expect((await f.detail(prepared.id)).state).toBe('accepted');
    const task = await client.intakeTask('shipment:' + s.shipmentId),
      account = (
        await routing.pool.query('SELECT account_id FROM tawsel.drivers WHERE driver_id=$1', [
          f.driverResource,
        ])
      ).rows[0].account_id;
    const principal = { kind: 'account', issuer: companyIssuer, subject: f.admin.subject },
      device = {
        kind: 'device',
        tenantId: scope.tenantId,
        accountId: account,
        deviceId: randomUUID(),
        deviceGeneration: 1,
        deviceSequence: 1,
      };
    const human = (operationId: string, payload: object) => ({
      ...wire(operationId, payload),
      context: device,
    });
    const location = human('location.confirmPin', {
      taskId: task.taskId,
      expectedSourceRevision: task.sourceRevision,
      expectedLocationRevision: 0,
      confirmed: true,
      selection: { kind: 'manual', coordinates: { latitude: 30.05, longitude: 31.24 } },
    });
    location.resources = { taskId: task.taskId };
    expect(
      (await new Locations(routing.pool).confirm(principal, location)).receipt.businessStatus,
    ).toBe('accepted');
    const planning = new PlanningService(routing.pool),
      rounds = new Rounds(routing.pool);
    await planning.command(
      principal,
      human('planning.saveDraft', {
        driverId: f.driverResource,
        expectedSettingsRevision: 0,
        settings: {
          mode: 'car',
          origin: { kind: 'manual-pin', coordinates: { latitude: 30, longitude: 31 } },
          endpoint: { kind: 'last-customer' },
          plannedStartAt: new Date().toISOString(),
        },
      }),
    );
    const state = await planning.plans(principal, f.driverResource);
    await planning.command(
      principal,
      human('planning.setManualOrder', {
        driverId: f.driverResource,
        expectedSettingsRevision: state.settingsRevision,
        expectedInputRevision: state.inputRevision,
        expectedManualRevision: state.manualRevision,
        selection: { kind: 'order', taskIds: [task.taskId] },
      }),
    );
    const plan = (await planning.plans(principal, f.driverResource)).items[0],
      readiness = await rounds.readiness(principal, {
        driverId: f.driverResource,
        deviceId: device.deviceId,
        planId: plan.planId,
        expectedPlanRevision: plan.revision,
        relevantActionIds: [],
      });
    const started = await rounds.start(
      principal,
      human('round.start', {
        driverId: f.driverResource,
        planId: plan.planId,
        expectedPlanRevision: plan.revision,
        readinessId: readiness.readinessId,
      }),
    );
    expect(started.receipt.businessStatus).toBe('accepted');
    const round = started.response.body.round,
      member = plan.input.members[0],
      base = {
        roundId: round.roundId,
        taskId: task.taskId,
        attemptId: member.attemptId,
        expectedActivityRevision: 0,
        expectedCurrentAttemptId: null,
        expectedSourceRevision: member.sourceRevision,
        expectedAssignmentRevision: member.assignmentRevision,
        expectedPinRevision: member.pinRevision,
      };
    const current = new CurrentActivity(routing.pool);
    expect(
      (await current.command(principal, human('current.selectHeading', base))).receipt
        .businessStatus,
    ).toBe('accepted');
    expect(
      (
        await current.command(
          principal,
          human('current.recordArrival', {
            ...base,
            expectedActivityRevision: 1,
            expectedCurrentAttemptId: member.attemptId,
          }),
        )
      ).receipt.businessStatus,
    ).toBe('accepted');
    const refusal = {
      ...human('outcome.recordRefusal', {
        ...base,
        expectedActivityRevision: 2,
        expectedCurrentAttemptId: member.attemptId,
        shippingPayment: 'refused',
        reportedCollection: { amountMinor: 0, currency: 'EGP', exponent: 2 },
        rejection: { catalogVersion: '1.0.0', code: 'other', detail: 'لا يناسب العميل' },
      }),
      payloadVersion: '2.0.0',
    };
    identity.state.subject = f.admin.subject;
    const bootstrap = await fetch(remote + '/api/session/bootstrap'),
      csrf = (await bootstrap.json()).csrfToken,
      browser = bootstrap.headers.getSetCookie()[0]!.split(';')[0]!;
    const login = await fetch(remote + '/api/session/login', {
      method: 'POST',
      headers: {
        cookie: browser,
        origin: remote,
        'x-csrf-token': csrf,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ kind: 'company', companyCode: 'TRIAL' }),
    });
    expect(login.status).toBe(200);
    const authorization = await fetch((await login.json()).authorizationUrl, {
        redirect: 'manual',
      }),
      callback = await fetch(authorization.headers.get('location')!, {
        redirect: 'manual',
        headers: { cookie: browser },
      });
    expect(callback.headers.get('location')).toBe(remote + '/account?kind=company');
    const session = callback.headers.getSetCookie()[0]!.split(';')[0]!,
      humanHeaders = {
        cookie: browser + '; ' + session,
        origin: remote,
        'x-csrf-token': csrf,
        'content-type': 'application/json',
      };
    const invalidOther = structuredClone(refusal);
    invalidOther.actionId = randomUUID();
    delete (invalidOther.payload as { rejection: { detail?: string } }).rejection.detail;
    expect(
      (
        await fetch(remote + '/api/v1/outcomes/refusal?kind=company', {
          method: 'POST',
          headers: humanHeaders,
          body: JSON.stringify(invalidOther),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(remote + '/api/v1/outcomes/refusal?kind=company', {
          method: 'POST',
          headers: {
            authorization: 'Bearer ' + f.connection.serviceBearer,
            'content-type': 'application/json',
          },
          body: JSON.stringify(refusal),
        })
      ).status,
    ).toBe(403);
    const outcomeHttp = await fetch(remote + '/api/v1/outcomes/refusal?kind=company', {
        method: 'POST',
        headers: humanHeaders,
        body: JSON.stringify(refusal),
      }),
      accepted = await outcomeHttp.json();
    expect(outcomeHttp.status, JSON.stringify(accepted)).toBe(200);
    expect(accepted.receipt.businessStatus).toBe('accepted');
    void Outcomes;
    const projection = new ProjectionWorker(erp.pool);
    for (let i = 0; i < 100; i++) if (!(await runOutboxOnce(routing.pool, outbox))) break;
    for (let i = 0; i < 100; i++) if (!(await projection.runOne())) break;
    const view = await UnitOfWork.run(erp.pool, f.admin.token, f.company, 'tracking', (u) =>
      trackingDetail(u, s.shipmentId),
    );
    expect(view.attempts[0]).toMatchObject({
      reasonState: 'known',
      reasonDetail: 'لا يناسب العميل',
      visitKnown: true,
    });
    const pending = (
      await erp.pool.query(
        'SELECT event_type,pending_reason FROM integration.inbox WHERE application_state=$1',
        ['pending'],
      )
    ).rows;
    expect(pending).toEqual([]);
    const before = (
      await erp.pool.query('SELECT row_to_json(e) value FROM kernel.journal_effect e ORDER BY id')
    ).rows;
    const correction = {
      ...human('outcome.correct', {
        roundId: round.roundId,
        taskId: task.taskId,
        attemptId: member.attemptId,
        expectedOutcomeRevision: 1,
        replacement: {
          outcome: 'refused',
          shippingPayment: 'refused',
          reportedCollection: { amountMinor: 0, currency: 'EGP', exponent: 2 },
          rejection: { catalogVersion: '1.0.0', code: 'changed-mind' },
        },
      }),
      payloadVersion: '2.0.0',
    };
    const changed = await fetch(remote + '/api/v1/corrections/outcomes?kind=company', {
      method: 'POST',
      headers: humanHeaders,
      body: JSON.stringify(correction),
    });
    expect(changed.status).toBe(200);
    expect((await changed.json()).receipt.businessStatus).toBe('accepted');
    for (let i = 0; i < 100; i++) if (!(await runOutboxOnce(routing.pool, outbox))) break;
    for (let i = 0; i < 100; i++) if (!(await projection.runOne())) break;
    expect(
      (await erp.pool.query('SELECT row_to_json(e) value FROM kernel.journal_effect e ORDER BY id'))
        .rows,
    ).toEqual(before);
    const corrected = await UnitOfWork.run(erp.pool, f.admin.token, f.company, 'tracking', (u) =>
      trackingDetail(u, s.shipmentId),
    );
    expect(corrected.attempts[0]!.history).toHaveLength(2);
    expect(corrected.attempts[0]!.reasonDetail).toBeNull();
    const m = await f.create(),
      register = f.prepareInput([m]) as Extract<DispatchCommand, { type: 'dispatch.prepare' }>,
      staged = (await f.commands.execute(f.admin.token, { ...register, prepareAssignment: false }))
        .body as DispatchResult;
    await f.completeNext();
    expect((await f.detail(staged.intentId)).state).toBe('unassigned');
    const send = goodsTransferCommands(erp.pool, 'send'),
      receive = goodsTransferCommands(erp.pool, 'receive'),
      goods = (v: object) =>
        ({
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          branchId: f.a,
          ...v,
        }) as GoodsTransferCommand;
    const manifest = (
      await send.execute(
        f.admin.token,
        goods({
          type: 'goods.create',
          destinationBranchId: f.b,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [
            {
              kind: 'parcel',
              shipmentId: m.shipmentId,
              expectedVersion: (await f.read(m.shipmentId))!.version,
            },
          ],
        }),
      )
    ).body as GoodsTransferResult;
    const handed = (
        await send.execute(
          f.admin.token,
          goods({
            type: 'goods.handover',
            manifestId: manifest.manifestId,
            expectedVersion: manifest.version,
            actualAt: new Date().toISOString(),
          }),
        )
      ).body as GoodsTransferResult,
      line = (await transferView(erp.pool, f.company, manifest.manifestId))!.lines[0]!;
    await receive.execute(
      f.staffB.token,
      goods({
        type: 'goods.receive',
        branchId: f.b,
        manifestId: manifest.manifestId,
        expectedVersion: handed.version,
        actualAt: new Date().toISOString(),
        lines: [
          {
            lineId: line.id,
            sound: 1,
            damaged: 0,
            uncertain: 0,
            inspection: 'parcel-exterior',
            suspectedInternalIssue: false,
          },
        ],
      }),
    );
    const moved = (
      await f.commands.execute(f.admin.token, {
        ...f.prepareInput([{ ...m, version: (await f.read(m.shipmentId))!.version }]),
        branchId: f.b,
      } as DispatchCommand)
    ).body as DispatchResult;
    await f.completeNext();
    await f.completeNext();
    expect((await f.detail(moved.intentId)).state).toBe('prepared');
    const cycles = await client.intakeCycles('shipment:' + m.shipmentId);
    expect(cycles).toHaveLength(2);
    expect(cycles.find((c) => c.latest)?.snapshot.sourceBranchExternalId).toBe('branch:' + f.b);
    expect(cycles.find((c) => !c.latest)?.snapshot.sourceBranchExternalId).toBe('branch:' + f.a);
    const offer = human('return.requestHandover', {
      roundId: round.roundId,
      sourceBranchId: (
        await erp.pool.query(
          "SELECT resource_id FROM integration.binding WHERE company_id=$1 AND entity='branch' AND native_id=$2",
          [f.company, f.a],
        )
      ).rows[0].resource_id,
      items: task.snapshot.lines.map((line) => ({
        taskId: task.taskId,
        dispatchCycleId: task.dispatchCycleId,
        outcomeId: corrected.attempts[0]!.history.at(-1)!.outcomeId,
        sourceLineId: line.sourceLineId,
        quantity: line.quantity,
      })),
    });
    const offered = await fetch(remote + '/api/v1/returns/request?kind=company', {
        method: 'POST',
        headers: humanHeaders,
        body: JSON.stringify(offer),
      }),
      offeredBody = await offered.json();
    expect(offered.status, JSON.stringify(offeredBody)).toBe(200);
    expect(offeredBody.receipt.businessStatus).toBe('accepted');
    const request = offeredBody.response.body.request as ReturnRequest;
    for (let i = 0; i < 100; i++) if (!(await runOutboxOnce(routing.pool, outbox))) break;
    for (let i = 0; i < 100; i++) if (!(await projection.runOne())) break;
    const returns = returnCommands(erp.pool),
      nativeReturn = (v: object) =>
        ({
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          branchId: f.a,
          ...v,
        }) as ReturnCommand;
    await returns.execute(
      f.admin.token,
      nativeReturn({
        type: 'return.receive',
        requestId: request.requestId,
        actualReceipt: true,
        observedAt: new Date().toISOString(),
        items: request.items.map((item) => ({
          itemId: item.itemId,
          expectedRevision: 0,
          quantity: item.requested,
          condition: 'sound',
          inspection: 'parcel-exterior',
          suspectedShortage: false,
        })),
      }),
    );
    await f.completeNext();
    const returnedLine = (
      await erp.pool.query(
        'SELECT id,version,quantity FROM returns.return_receipt_line WHERE shipment_id=$1',
        [s.shipmentId],
      )
    ).rows;
    expect(returnedLine).toHaveLength(task.snapshot.lines.length);
    expect(
      (
        await erp.pool.query(
          'SELECT r.source_line_id,r.quantity,r.consumed,r.branch_id,r.condition,cy.latest FROM returns.return_receipt_line r JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(r.company_id,r.cycle_id) WHERE r.shipment_id=$1',
          [s.shipmentId],
        )
      ).rows,
    ).toEqual(
      expect.arrayContaining(
        (await f.read(s.shipmentId))!.fields.lines.map((l) => ({
          source_line_id: l.id,
          quantity: l.quantity,
          consumed: 0,
          branch_id: f.a,
          condition: 'sound',
          latest: true,
        })),
      ),
    );
    const returnedTransfer = (
      await send.execute(
        f.admin.token,
        goods({
          type: 'goods.create',
          destinationBranchId: f.b,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [
            {
              kind: 'parcel',
              shipmentId: s.shipmentId,
              expectedVersion: (await f.read(s.shipmentId))!.version,
            },
          ],
        }),
      )
    ).body as GoodsTransferResult;
    const returnHanded = (
        await send.execute(
          f.admin.token,
          goods({
            type: 'goods.handover',
            manifestId: returnedTransfer.manifestId,
            expectedVersion: returnedTransfer.version,
            actualAt: new Date().toISOString(),
          }),
        )
      ).body as GoodsTransferResult,
      returnTransferLine = (await transferView(erp.pool, f.company, returnedTransfer.manifestId))!
        .lines[0]!;
    await receive.execute(
      f.staffB.token,
      goods({
        type: 'goods.receive',
        branchId: f.b,
        manifestId: returnedTransfer.manifestId,
        expectedVersion: returnHanded.version,
        actualAt: new Date().toISOString(),
        lines: [
          {
            lineId: returnTransferLine.id,
            sound: 1,
            damaged: 0,
            uncertain: 0,
            inspection: 'parcel-exterior',
            suspectedInternalIssue: false,
          },
        ],
      }),
    );
    const previous = (
      await erp.pool.query(
        'SELECT id FROM dispatch.cycle WHERE company_id=$1 AND shipment_id=$2 AND latest',
        [f.company, s.shipmentId],
      )
    ).rows[0].id;
    // Disclosed isolated fixture funding supplies the next dispatch's required
    // shipping cover; it is not a receipt, company remittance or readiness probe.
    await f.credit(f.seed.brand, '100000', '0');
    const again = (
      await returns.execute(
        f.admin.token,
        nativeReturn({
          type: 'return.redispatch',
          branchId: f.b,
          previousCycleId: previous,
          driverId: f.driver,
          allocations: returnedLine.map((line) => ({
            receiptLineId: line.id,
            expectedVersion: line.version + 1,
            quantity: line.quantity,
          })),
        }),
      )
    ).body as ReturnResult;
    await f.completeNext();
    await f.completeNext();
    expect((await f.detail(again.dispatchIntentId!)).state).toBe('prepared');
    const returnedCycles = await client.intakeCycles('shipment:' + s.shipmentId);
    expect(returnedCycles).toHaveLength(2);
    expect(returnedCycles.find((c) => c.latest)?.snapshot.sourceBranchExternalId).toBe(
      'branch:' + f.b,
    );
    expect(
      (
        await erp.pool.query(
          'SELECT count(*)::int n FROM returns.return_receipt_line r JOIN returns.return_receipt p ON(p.company_id,p.id)=(r.company_id,r.receipt_id) WHERE r.shipment_id=$1 AND p.branch_id=$2',
          [s.shipmentId, f.b],
        )
      ).rows[0].n,
    ).toBe(0);
    const physicalMoney = (
      await erp.pool.query('SELECT row_to_json(e) value FROM kernel.journal_effect e ORDER BY id')
    ).rows;
    for (let i = 0; i < 100; i++) if (!(await runOutboxOnce(routing.pool, outbox))) break;
    for (let i = 0; i < 100; i++) if (!(await projection.runOne())) break;
    expect(
      (
        await erp.pool.query(
          "SELECT event_type,pending_reason FROM integration.inbox WHERE application_state='pending'",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await erp.pool.query('SELECT row_to_json(e) value FROM kernel.journal_effect e ORDER BY id'))
        .rows,
    ).toEqual(physicalMoney);
    const journals = before.length;
    void Corrections;
    await writeFile(
      'docs/verification/P27/independent-business.json',
      JSON.stringify(
        {
          classification:
            'Exact candidate Git source in an isolated copy, independent disposable PostgreSQL clusters, actual routing HTTP/scoped provisioning, separate HTTP issuer-administration/OIDC fixture, actual issuer/outbox workers, real driver-session HTTP refusal and signed HTTP native projection. Planning/current actions use authorized domain services. Local protocol issuer, no owner/device/Keycloak/production claim.',
          publisherCommit: 'fff79bcb90aaba5676bbc0cd64d78d9ce93845b2',
          nativeShipmentId: s.shipmentId,
          taskId: task.taskId,
          roundId: round.roundId,
          sourceRevision: 1,
          rejection: corrected.attempts,
          reasonOnlyMoneyUnchanged: true,
          isolatedOpeningCredit: {
            amountMinor: '100000',
            readiness: 'eligible',
            classification:
              'Explicit native isolated fixture credit for next shipping cover; no cash or remote readiness probe',
          },
          actualReturnedTransferId: returnedTransfer.manifestId,
          actualReturnReceiptLineIds: returnedLine.map((line) => line.id),
          returnedCycles: returnedCycles.map((c) => ({
            taskId: c.taskId,
            dispatchCycleId: c.dispatchCycleId,
            sourceRevision: c.sourceRevision,
            latest: c.latest,
            sourceBranchExternalId: c.snapshot.sourceBranchExternalId,
          })),
          nativeTransferId: manifest.manifestId,
          relocatedNativeShipmentId: m.shipmentId,
          cycles: cycles.map((c) => ({
            taskId: c.taskId,
            dispatchCycleId: c.dispatchCycleId,
            sourceRevision: c.sourceRevision,
            latest: c.latest,
            sourceBranchExternalId: c.snapshot.sourceBranchExternalId,
          })),
          received: (
            await erp.pool.query(
              'SELECT event_type,application_state,body_hash FROM integration.inbox ORDER BY received_at',
            )
          ).rows,
          journalEffects: journals,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await app?.close();
    await tawsel?.close();
    await issuer?.close();
    await erp.dispose();
    await routing.dispose();
  }
}, 120000);
