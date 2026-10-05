import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';

export type TransferLineInput =
  | { kind: 'parcel'; shipmentId: string; expectedVersion: number }
  | { kind: 'loose'; brandId: string; variantId: string; quantity: number };
export type TransferReceiptInput = {
  lineId: string;
  sound: number;
  damaged: number;
  uncertain: number;
  inspection: 'counted-pieces' | 'parcel-exterior';
  suspectedInternalIssue: boolean;
};
export type GoodsTransferCommand = {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  branchId: string;
} & (
  | {
      type: 'goods.create';
      destinationBranchId: string;
      driverId: string;
      plannedAt: string;
      lines: TransferLineInput[];
    }
  | {
      type: 'goods.handover' | 'goods.cancel';
      manifestId: string;
      expectedVersion: number;
      actualAt: string;
    }
  | {
      type: 'goods.receive' | 'goods.sourceReturn';
      manifestId: string;
      expectedVersion: number;
      actualAt: string;
      lines: TransferReceiptInput[];
    }
);
export type GoodsTransferResult = {
  commandId: string;
  manifestId: string;
  branchId: string;
  reference: string;
  version: number;
  state: 'prepared' | 'in_transit' | 'closed' | 'cancelled';
};
export type GoodsTransferLineView = {
  id: string;
  kind: 'parcel' | 'loose';
  brandId: string;
  brandName: string;
  shipmentId: string | null;
  shipmentReference: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  remaining: number;
};
export type GoodsTransferView = {
  id: string;
  reference: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  driverId: string;
  driverName: string;
  state: GoodsTransferResult['state'];
  version: number;
  plannedAt: string;
  createdAt: string;
  handoverAt: string | null;
  lines: GoodsTransferLineView[];
  receipts: {
    id: string;
    kind: 'destination' | 'source_return';
    branchId: string;
    actorName: string;
    actualAt: string;
    lines: TransferReceiptInput[];
  }[];
};
export type GoodsTransferDesk = {
  assignedBranches: { id: string; name: string }[];
  companyBranches: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  drivers: {
    id: string;
    name: string;
    branchId: string;
    atSourceBranch: boolean | null;
    round: string | null;
    evidenceAt: string | null;
    status: 'known' | 'stale' | 'unknown';
  }[];
  items: GoodsTransferView[];
  total: number;
  page: number;
};
/** Review candidates only. Neither remaining custody nor an exterior suspicion confirms loss or liability. */
export type GoodsTransferIncidentCandidate = {
  manifestId: string;
  lineId: string;
  shipmentId: string | null;
  sourceBranchId: string;
  destinationBranchId: string;
  driverId: string;
  carrierRemaining: number;
  suspectedInternalIssue: boolean;
};

const uuid = { type: 'string', format: 'uuid' };
const qty = { type: 'integer', minimum: 0, maximum: 1000000 };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const common = { schemaVersion: { const: 1 }, commandId: uuid, companyId: uuid, branchId: uuid };
const expected = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const actual = { type: 'string', format: 'date-time' };
const receiptLine = obj({
  lineId: uuid,
  sound: qty,
  damaged: qty,
  uncertain: qty,
  inspection: { enum: ['counted-pieces', 'parcel-exterior'] },
  suspectedInternalIssue: { type: 'boolean' },
});
export const goodsTransferCommandSchema = {
  oneOf: [
    obj({
      ...common,
      type: { const: 'goods.create' },
      destinationBranchId: uuid,
      driverId: uuid,
      plannedAt: actual,
      lines: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          oneOf: [
            obj({ kind: { const: 'parcel' }, shipmentId: uuid, expectedVersion: expected }),
            obj({
              kind: { const: 'loose' },
              brandId: uuid,
              variantId: uuid,
              quantity: { ...qty, minimum: 1 },
            }),
          ],
        },
      },
    }),
    ...(['goods.handover', 'goods.cancel'] as const).map((type) =>
      obj({
        ...common,
        type: { const: type },
        manifestId: uuid,
        expectedVersion: expected,
        actualAt: actual,
      }),
    ),
    ...(['goods.receive', 'goods.sourceReturn'] as const).map((type) =>
      obj({
        ...common,
        type: { const: type },
        manifestId: uuid,
        expectedVersion: expected,
        actualAt: actual,
        lines: { type: 'array', minItems: 1, maxItems: 100, items: receiptLine },
      }),
    ),
  ],
};
const Ajv = AjvModule.default;
const addFormats = formatsModule.default;
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const commandValidator = ajv.compile<GoodsTransferCommand>(goodsTransferCommandSchema);
export const validateGoodsTransferCommand = (input: unknown): input is GoodsTransferCommand =>
  commandValidator(input);
export const goodsTransferPaths = {
  '/api/v1/goods-transfers': { get: { summary: 'Scoped physical manifests' } },
  '/api/v1/goods-transfers/{id}': { get: { summary: 'Manifest and immutable receipt trail' } },
  '/api/v1/goods-transfers/eligible': {
    get: { summary: 'Available source parcels and loose sound stock' },
  },
  '/api/v1/goods-transfers/carriers': {
    get: { summary: 'Active company carriers with advisory source-filtered round evidence' },
  },
  '/api/v1/goods-transfers/commands': {
    post: {
      summary: 'Reserve, hand over, cancel or receive actual goods',
      requestBody: { content: { 'application/json': { schema: goodsTransferCommandSchema } } },
      responses: {
        '200': { description: 'Committed native result' },
        '409': { description: 'Retained conflict' },
      },
    },
  },
  '/api/v1/goods-transfers/commands/{commandId}': {
    get: { summary: 'Recover a native command result' },
  },
  '/api/v1/goods-receipts': { get: { summary: 'Scoped incoming and source-return manifests' } },
  '/api/v1/goods-receipts/{id}': {
    get: { summary: 'Authorized actual receipt and remaining carrier balance' },
  },
};
