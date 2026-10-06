import { registerDispatch } from './modules/dispatch/dispatch.controller.js';
import { registerReturns } from './modules/returns/http.js';
import { registerGoodsTransfers } from './modules/goods-transfers/http.js';
import { registerTracking } from './modules/tracking/http.js';
import { registerExecutionReads } from './modules/execution/http.js';
import { registerFinance } from './modules/finance/http.js';
import { registerRemittances } from './modules/finance/remittances/http.js';
import { registerBrandWallets } from './modules/finance/brand-wallet/http.js';
import { registerBrandPayouts } from './modules/finance/brand-payouts/http.js';
import { registerIncidents } from './modules/incidents/http.js';
import { registerIntegration } from './modules/integration/http.js';
import { integrationRuntime, type IntegrationRuntime } from './modules/integration/config.js';
import { registerTreasury } from './modules/finance/treasury-transfers/http.js';
import 'reflect-metadata';
import {
  Controller,
  Get,
  HttpException,
  Inject,
  Module,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type ExceptionFilter,
  type ArgumentsHost,
  Catch,
} from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import { registerAccess } from './modules/access/http.js';
import { registerKernel } from './modules/kernel/http.js';
import { registerBrands } from './modules/brands/http.js';
import { registerInventory } from './modules/inventory/http.js';
import { registerShipments } from './modules/shipments/http.js';
import { registerEmployees } from './modules/employees/http.js';
import { identityConfig, type IdentityConfig } from './modules/access/config.js';
import {
  createPool,
  databaseConfig,
  migrationStatus,
  readMigrations,
  type DatabaseConfig,
} from '@shahn/database';
import {
  validateReadiness,
  validateLiveness,
  type Readiness,
  type Liveness,
} from '@shahn/contracts';

const PUBLIC_STATUS = 'foundation.publicStatus';
/** Fail closed. P02 replaces this with a real session/AccessContext adapter. */
export class AuthenticationGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.get<boolean>(PUBLIC_STATUS, context.getHandler())) return true;
    throw new UnauthorizedException();
  }
}
export class DatabaseLifecycle {
  readonly pool;
  constructor(config: DatabaseConfig) {
    this.pool = createPool(config.runtimeUrl);
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    void response.code(status).send({
      code:
        status === 401
          ? 'AUTHENTICATION_REQUIRED'
          : status === 404
            ? 'NOT_FOUND'
            : 'REQUEST_FAILED',
      messageKey: status === 401 ? 'access.signInRequired' : 'request.failed',
    });
  }
}
@Controller('api/v1')
class StatusController {
  constructor(@Inject(DatabaseLifecycle) private readonly database: DatabaseLifecycle) {}
  @Get('health')
  @SetMetadata(PUBLIC_STATUS, true)
  health(): Liveness {
    const body: Liveness = {
      schemaVersion: 1,
      service: 'api',
      status: 'alive',
      dependenciesChecked: false,
      checkedAt: new Date().toISOString(),
    };
    if (!validateLiveness(body)) throw new Error('INVALID_STATUS_RESPONSE');
    return body;
  }
  @Get('readiness')
  @SetMetadata(PUBLIC_STATUS, true)
  async readiness(): Promise<Readiness> {
    const registered = await readMigrations();
    let body: Readiness = {
      schemaVersion: 1,
      service: 'api',
      status: 'not_ready',
      checkedAt: new Date().toISOString(),
      database: 'unavailable',
      migrations: { state: 'unknown', applied: [], required: registered.map((m) => m.version) },
    };
    try {
      await this.database.pool.query('SELECT 1');
      body.database = 'connected';
      const status = await migrationStatus(this.database.pool, registered);
      body.migrations = {
        state: status.state,
        applied: status.applied.map((m) => m.version),
        required: status.required,
      };
      if (status.state === 'current') {
        const identity = await this.database.pool.query<{ schema_version: number }>(
          'SELECT schema_version FROM erp_infrastructure.schema_identity WHERE singleton = true',
        );
        if (identity.rows.length === 1 && identity.rows[0]?.schema_version === 1)
          body.status = 'ready';
        else body.migrations.state = 'incompatible';
      }
    } catch {
      if (body.database === 'connected') body.migrations.state = 'incompatible';
    }
    body = { ...body, checkedAt: new Date().toISOString() };
    if (!validateReadiness(body)) throw new Error('INVALID_STATUS_RESPONSE');
    if (body.status !== 'ready') throw new HttpException(body, 503);
    return body;
  }
}
export async function createApplication(
  config = databaseConfig(),
  identity: IdentityConfig | null = identityConfig(),
  integration: IntegrationRuntime = integrationRuntime(),
): Promise<NestFastifyApplication> {
  @Module({
    controllers: [StatusController],
    providers: [
      { provide: DatabaseLifecycle, useFactory: () => new DatabaseLifecycle(config) },
      { provide: APP_GUARD, useClass: AuthenticationGuard },
    ],
  })
  class FoundationModule {}
  const app = await NestFactory.create<NestFastifyApplication>(
    FoundationModule,
    new FastifyAdapter({ logger: false }),
    { logger: false },
  );
  // Readiness is the one intentionally public safe 503 response. All other errors are sanitized.
  app.useGlobalFilters({
    catch(error: unknown, host: ArgumentsHost) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 503 &&
        validateReadiness(error.getResponse())
      ) {
        void host.switchToHttp().getResponse<FastifyReply>().code(503).send(error.getResponse());
      } else new SafeErrors().catch(error, host);
    },
  });
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  registerAccess(app.getHttpAdapter().getInstance(), app.get(DatabaseLifecycle).pool, identity);
  registerTracking(app.getHttpAdapter().getInstance(), app.get(DatabaseLifecycle).pool);
  registerExecutionReads(app.getHttpAdapter().getInstance(), app.get(DatabaseLifecycle).pool);
  registerReturns(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    integration,
  );
  registerGoodsTransfers(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    integration,
  );
  registerDispatch(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    integration,
  );
  registerIntegration(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    integration,
  );
  registerFinance(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerRemittances(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    integration,
  );
  registerBrandWallets(app.getHttpAdapter().getInstance(), app.get(DatabaseLifecycle).pool);
  registerIncidents(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerBrandPayouts(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerTreasury(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerEmployees(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerShipments(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerInventory(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  registerBrands(
    app.getHttpAdapter().getInstance(),
    app.get(DatabaseLifecycle).pool,
    identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
  );
  if (config.environment === 'development' && process.env['ENABLE_KERNEL_FIXTURES'] === 'true')
    registerKernel(
      app.getHttpAdapter().getInstance(),
      app.get(DatabaseLifecycle).pool,
      config.environment,
      identity?.origin ?? process.env['APP_ORIGIN'] ?? '',
    );
  return app;
}
