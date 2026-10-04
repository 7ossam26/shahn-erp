import { randomUUID } from 'node:crypto';
import { TextDecoder } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import {
  transaction,
  insertReceivedEvent,
  InboxConflict,
  type IntegrationSource,
} from '@shahn/database';
import {
  maxWebhookBytes,
  validateSenderSchema,
  senderIdentityValid,
} from '@shahn/contracts/tawsel';
import { ReceiverError, securityHeaders, verifySignature } from './signature-verifier.js';
import type { IntegrationRuntime } from './config.js';
export function registerSignedReceiver(
  app: FastifyInstance,
  pool: Pool,
  runtime: IntegrationRuntime,
) {
  // Encapsulated parser preserves exact bytes; other application routes retain normal JSON parsing.
  void app.register(async (receiver) => {
    receiver.removeContentTypeParser('application/json');
    receiver.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer', bodyLimit: maxWebhookBytes },
      (_req, body, done) => done(null, body),
    );
    receiver.post('/api/v1/consumer/events', { bodyLimit: maxWebhookBytes }, async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const raw = req.body;
        if (!Buffer.isBuffer(raw)) throw new ReceiverError('invalid_json', 400);
        const headers = securityHeaders(req.raw.rawHeaders);
        const source = (
          await pool.query<IntegrationSource>(
            'SELECT * FROM integration.source WHERE tenant_id::text=$1 AND integration_id::text=$2',
            [headers['x-tawsel-tenant-id'], headers['x-tawsel-integration-id']],
          )
        ).rows[0];
        if (!source) throw new ReceiverError('invalid_signature', 401);
        const connection = runtime.connections.find(
          (c) =>
            c.selector === source.selector &&
            c.companyId === source.company_id &&
            c.tenantId === source.tenant_id &&
            c.integrationId === source.integration_id,
        );
        if (!connection) throw new ReceiverError('receiver_unavailable', 503);
        const keyRows = (
          await pool.query<{ key_id: string; active_from: Date; verify_until: Date | null }>(
            'SELECT * FROM integration.verification_key WHERE company_id=$1 AND source_id=$2',
            [source.company_id, source.id],
          )
        ).rows;
        const metadata = verifySignature(
          raw,
          req.raw.rawHeaders,
          { tenantId: source.tenant_id, integrationId: source.integration_id },
          keyRows
            .filter((k) => connection.signingKeys[k.key_id])
            .map((k) => ({
              keyId: k.key_id,
              secretHex: connection.signingKeys[k.key_id]!,
              activeFrom: k.active_from,
              verifyUntil: k.verify_until,
            })),
        );
        let event: unknown;
        try {
          event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
        } catch {
          throw new ReceiverError('invalid_json', 400);
        }
        if (!validateSenderSchema(event)) {
          await pool.query(
            `UPDATE integration.source SET last_error='UNSUPPORTED_SENDER_EVENT' WHERE company_id=$1 AND id=$2`,
            [source.company_id, source.id],
          );
          throw new ReceiverError('unsupported_event', 422);
        }
        if (
          event.tenantId !== source.tenant_id ||
          event.recipientIntegrationId !== source.integration_id ||
          !senderIdentityValid(event)
        )
          throw new ReceiverError('event_identity_mismatch', 409);
        const ack = await transaction(pool, (client) =>
          insertReceivedEvent(client, source, event, raw, metadata),
        );
        return reply.code(200).send(ack);
      } catch (error) {
        const known = error instanceof ReceiverError || error instanceof InboxConflict;
        const status =
          error instanceof ReceiverError
            ? error.status
            : error instanceof InboxConflict
              ? 409
              : 503;
        return reply
          .code(status)
          .type('application/problem+json')
          .send({
            type: 'https://shahn.invalid/problems/receiver',
            title: 'Event receipt failed',
            status,
            code: known ? error.code : 'receiver_unavailable',
            correlationId: randomUUID(),
            retryable: status === 503,
          });
      }
    });
  });
}
