import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { transferView } from '@shahn/database';
import { validateGoodsTransferCommand } from '@shahn/contracts';
import { AccessError } from '@shahn/domain';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import type { IntegrationRuntime } from '../integration/config.js';
import { goodsTransferCommands } from './transfer.service.js';
import { transferDesk, eligibleTransferContents, type TransferFilter } from './query.service.js';
import { carrierCandidates } from './carrier-query.service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
export function registerGoodsTransfers(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  const send = goodsTransferCommands(pool, 'send'),
    receive = goodsTransferCommands(pool, 'receive');
  app.post('/api/v1/goods-transfers/commands', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      if (
        req.headers.authorization ||
        req.headers['x-company-id'] ||
        req.headers['x-user-id'] ||
        req.headers['x-company']
      )
        throw new AccessError('FORBIDDEN_SCOPE');
      if (!validateGoodsTransferCommand(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
      const token = sessionToken(req),
        session = await sessionIdentity(pool, token),
        actual = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
        expected = Buffer.from(session.csrf_token);
      if (
        req.headers.origin !== origin ||
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new AccessError('CSRF_FAILED');
      const body = req.body;
      const result = await (
        body.type === 'goods.receive' || body.type === 'goods.sourceReturn' ? receive : send
      ).execute(token, body);
      return reply.code(result.status).send(result.body);
    } catch (error) {
      if (error instanceof RetainedCommandError)
        return reply.code(error.reply.status).send(error.reply.body);
      return reply.code(error instanceof AccessError ? error.status : 500).send({
        code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
        correlationId: randomUUID(),
      });
    }
  });
  app.get('/api/v1/goods-transfers/commands/:commandId', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const q = req.query as Record<string, string>,
        p = req.params as { commandId: string };
      if (
        !uuid.test(q.companyId ?? '') ||
        !uuid.test(p.commandId) ||
        !['send', 'receive'].includes(q.screen ?? '') ||
        Object.keys(q).some((k) => !['companyId', 'screen'].includes(k))
      )
        throw new AccessError('VALIDATION_FAILED', 400);
      const commands = q.screen === 'receive' ? receive : send;
      const result = await commands.recover(
        sessionToken(req),
        q.companyId!,
        'goods-transfer-' + q.screen,
        p.commandId,
      );
      return reply.code(result.status).send(result.body);
    } catch (error) {
      return reply.code(error instanceof AccessError ? error.status : 500).send({
        code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
        correlationId: randomUUID(),
      });
    }
  });
  app.get('/api/v1/goods-transfers/carriers', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const q = req.query as Record<string, string>;
      if (
        !uuid.test(q.companyId ?? '') ||
        !uuid.test(q.sourceBranchId ?? '') ||
        Object.keys(q).some((k) => !['companyId', 'sourceBranchId'].includes(k))
      )
        throw new AccessError('VALIDATION_FAILED', 400);
      return reply.send({
        items: await carrierCandidates(
          pool,
          sessionToken(req),
          q.companyId!,
          q.sourceBranchId!,
          runtime,
        ),
      });
    } catch (error) {
      return reply.code(error instanceof AccessError ? error.status : 500).send({
        code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
        correlationId: randomUUID(),
      });
    }
  });
  app.get('/api/v1/goods-transfers/eligible', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const q = req.query as Record<string, string>;
      if (
        !uuid.test(q.companyId ?? '') ||
        !uuid.test(q.sourceBranchId ?? '') ||
        Object.keys(q).some((k) => !['companyId', 'sourceBranchId'].includes(k))
      )
        throw new AccessError('VALIDATION_FAILED', 400);
      return reply.send(
        await UnitOfWork.run(pool, sessionToken(req), q.companyId, 'goods.send', (u) =>
          eligibleTransferContents(u, q.sourceBranchId!),
        ),
      );
    } catch (error) {
      return reply.code(error instanceof AccessError ? error.status : 500).send({
        code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
        correlationId: randomUUID(),
      });
    }
  });
  for (const [prefix, screen] of [
    ['/api/v1/goods-transfers', 'send'],
    ['/api/v1/goods-receipts', 'receive'],
  ] as const) {
    app.get(prefix, async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const q = req.query as Record<string, string>;
        const allowed = [
          'companyId',
          'branchId',
          'sourceBranchId',
          'destinationBranchId',
          'driverId',
          'brandId',
          'kind',
          'state',
          'search',
          'dateBasis',
          'from',
          'to',
          'discrepancy',
          'page',
          ...(screen === 'receive' ? ['sourceReturn'] : []),
        ];
        if (
          !uuid.test(q.companyId ?? '') ||
          Object.keys(q).some((k) => !allowed.includes(k)) ||
          ['branchId', 'sourceBranchId', 'destinationBranchId', 'driverId', 'brandId'].some(
            (k) => q[k] && !uuid.test(q[k]),
          ) ||
          ['from', 'to'].some((k) => q[k] && !date.test(q[k])) ||
          (q.kind && !['all', 'parcel', 'loose'].includes(q.kind)) ||
          (q.state &&
            !['all', 'prepared', 'in_transit', 'closed', 'cancelled'].includes(q.state)) ||
          (q.dateBasis && !['handover', 'receipt'].includes(q.dateBasis)) ||
          (q.discrepancy && !['true', 'false'].includes(q.discrepancy)) ||
          (q.sourceReturn && !['true', 'false'].includes(q.sourceReturn))
        )
          throw new AccessError('VALIDATION_FAILED', 400);
        const f: TransferFilter = {
          ...q,
          page: q.page ? Number(q.page) : 1,
          discrepancy: q.discrepancy === 'true',
          ...(q.kind ? { kind: q.kind as NonNullable<TransferFilter['kind']> } : {}),
          ...(q.state ? { state: q.state as NonNullable<TransferFilter['state']> } : {}),
          ...(q.dateBasis
            ? { dateBasis: q.dateBasis as NonNullable<TransferFilter['dateBasis']> }
            : {}),
        };
        const body = await UnitOfWork.run(
          pool,
          sessionToken(req),
          q.companyId,
          screen === 'send' ? 'goods.send' : 'goods.receive',
          (u) => transferDesk(u, q.sourceReturn === 'true' ? 'source_return' : screen, f),
        );
        return reply.send(body);
      } catch (error) {
        return reply.code(error instanceof AccessError ? error.status : 500).send({
          code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
          correlationId: randomUUID(),
        });
      }
    });
    app.get(prefix + '/:id', async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const q = req.query as Record<string, string>,
          p = req.params as { id: string };
        if (
          !uuid.test(q.companyId ?? '') ||
          !uuid.test(p.id) ||
          Object.keys(q).some(
            (k) => k !== 'companyId' && !(screen === 'receive' && k === 'sourceReturn'),
          ) ||
          (q.sourceReturn && !['true', 'false'].includes(q.sourceReturn))
        )
          throw new AccessError('VALIDATION_FAILED', 400);
        const body = await UnitOfWork.run(
          pool,
          sessionToken(req),
          q.companyId,
          screen === 'send' ? 'goods.send' : 'goods.receive',
          async (u) => {
            const view = await transferView(u.client, u.access.companyId, p.id);
            if (!view) throw new AccessError('NOT_FOUND', 404);
            u.assertBranch(
              screen === 'send' || q.sourceReturn === 'true'
                ? view.sourceBranchId
                : view.destinationBranchId,
            );
            return view;
          },
        );
        return reply.send(body);
      } catch (error) {
        return reply.code(error instanceof AccessError ? error.status : 500).send({
          code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
          correlationId: randomUUID(),
        });
      }
    });
  }
}
