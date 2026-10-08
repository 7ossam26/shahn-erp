import { describe, expect, it } from 'vitest';
import {
  openApi,
  settlementExamples,
  validateOpeningCommand,
  validateOpeningPrepareInput,
  validatePayrollMonth,
  validateSettlementCaseFilter,
  validateSettlementCommand,
  validateSettlementPrepareInput,
  validateSettlementViews,
  type OpeningCommand,
  type PayrollEarning,
  type PayrollObligation,
  type SettlementOperation,
  type SettlementPreview,
} from '@shahn/contracts';
import {
  accountObservation,
  accountPosition,
  assertUniqueOpeningTargets,
  calculatePayroll,
  correctedAmount,
  journalKinds,
  openingSignedMinor,
  openingTargetKey,
  sourceReviewDelta,
  stockObservation,
} from '@shahn/domain';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const command = settlementExamples.productObservation;
const withOperation = (operation: unknown) => ({ ...command, operation });
const operations: SettlementOperation[] = [
  command.operation,
  {
    operation: 'account.observe',
    accountId: id(5),
    branchId: id(2),
    observedMinor: '90000',
    actualDate: '2026-10-08',
  },
  {
    operation: 'account.resolve',
    caseId: id(6),
    resolution: {
      kind: 'missed_expense',
      amountMinor: '10000',
      branchId: id(2),
      categoryId: id(7),
      description: 'مصروف لم يسجل',
      method: 'cash',
      actualDate: '2026-10-08',
    },
  },
  {
    operation: 'account.resolve',
    caseId: id(6),
    resolution: {
      kind: 'company_loss',
      amountMinor: '100',
      branchId: id(2),
      actualDate: '2026-10-08',
    },
  },
  {
    operation: 'account.resolve',
    caseId: id(6),
    resolution: {
      kind: 'employee_liability',
      amountMinor: '100',
      branchId: id(2),
      employeeId: id(8),
      month: '2026-10',
      actualDate: '2026-10-08',
    },
  },
  {
    operation: 'brand.correct',
    brandId: id(3),
    effectId: id(9),
    amountMinor: '-500',
    actualDate: '2026-10-08',
  },
  {
    operation: 'brand.adjust',
    brandId: id(3),
    branchId: id(2),
    direction: 'credit',
    amountMinor: '500',
    agreementReference: 'اتفاق 12',
    actualDate: '2026-10-08',
  },
  {
    operation: 'employee.adjust',
    employeeId: id(8),
    month: '2026-10',
    kind: 'bonus',
    amountMinor: '500',
    workDate: '2026-10-08',
  },
  {
    operation: 'source.resolve',
    reviewId: id(10),
    decision: 'apply_effective',
    actualDate: '2026-10-08',
  },
  {
    operation: 'incident.resolve',
    incidentId: id(11),
    decision: 'retain_original',
    actualDate: '2026-10-08',
  },
  {
    operation: 'incident.resolve',
    incidentId: id(11),
    decision: 'correct_compensation',
    compensationDeltaMinor: '-100',
    actualDate: '2026-10-08',
  },
  {
    operation: 'storage.refund',
    brandId: id(3),
    branchId: id(2),
    accountId: id(5),
    method: 'cash',
    amountMinor: '10000',
    actualDate: '2026-10-08',
    externalReference: '',
    confirmCashOut: true,
  },
  { operation: 'parcel.cancel', shipmentId: id(12) },
];
const preview: SettlementPreview = {
  operation: 'product.observe',
  classification: 'stock_observation',
  target: { kind: 'product', id: id(4), label: 'قميص أزرق', branchId: id(2), branchName: 'فرع أ' },
  facts: [{ key: 'recorded', unit: 'quantity', before: '12', after: '10' }],
  effects: [
    {
      ledger: 'stock',
      kind: 'adjustment',
      label: 'فرق الجرد',
      amountMinor: null,
      quantity: -2,
      effectiveDate: '2026-10-08',
    },
  ],
  dependents: [],
  warnings: [],
  blockers: [],
  versions: [{ key: 'stock.position', version: '3' }],
  digest: 'b'.repeat(64),
};
const opening: OpeningCommand = {
  schemaVersion: 1,
  commandId: id(20),
  companyId: id(1),
  type: 'opening.confirm',
  openingDate: '2026-10-01',
  description: 'أرصدة ما قبل النظام',
  evidence: 'كشف يدوي',
  lines: [
    { classification: 'account_balance', accountId: id(5), branchId: id(2), amountMinor: '50000' },
    {
      classification: 'brand_eligible_credit',
      brandId: id(3),
      branchId: id(2),
      amountMinor: '20000',
    },
    {
      classification: 'employee_obligation',
      employeeId: id(8),
      branchId: id(2),
      month: '2026-10',
      amountMinor: '10000',
    },
    {
      classification: 'stock_sound',
      brandId: id(3),
      variantId: id(4),
      branchId: id(2),
      quantity: 3,
    },
  ],
  expectedDigest: 'c'.repeat(64),
};

describe('P21 closed settlement contracts', () => {
  it('accepts every typed operation and the documented example', () => {
    expect(validateSettlementCommand(command)).toBe(true);
    for (const operation of operations) {
      expect(validateSettlementCommand(withOperation(operation)), operation.operation).toBe(true);
      expect(validateSettlementPrepareInput({ companyId: id(1), operation })).toBe(true);
    }
  });
  it('has no free-form edit: unknown operations, extra fields and forged totals reject', () => {
    for (const forged of [
      {
        operation: 'record.edit',
        table: 'finance.money_movement',
        id: id(1),
        set: { amount_minor: 1 },
      },
      {
        operation: 'account.resolve',
        caseId: id(6),
        resolution: { kind: 'free_form', amountMinor: '1' },
      },
      { ...command.operation, delta: -2 },
      { ...command.operation, observedQuantity: -1 },
      { ...command.operation, observedQuantity: 1.5 },
      { ...operations[1], holdMinor: '10000' },
      { ...operations[6], direction: 'profit' },
      { ...operations[7], kind: 'salary' },
      { ...operations[11], confirmCashOut: false },
      { ...operations[11], revenueMinor: '0' },
    ])
      expect(validateSettlementCommand(withOperation(forged))).toBe(false);
    expect(validateSettlementCommand({ ...command, classification: 'stock_observation' })).toBe(
      false,
    );
    expect(validateSettlementCommand({ ...command, type: 'settlement.edit' })).toBe(false);
  });
  it('requires a reason, exact versions and a digest; amounts are exact piastres', () => {
    for (const reason of ['', '   '])
      expect(validateSettlementCommand({ ...command, reason })).toBe(false);
    const { reason: _r, ...noReason } = command;
    expect(validateSettlementCommand(noReason)).toBe(false);
    const { expectedDigest: _d, ...noDigest } = command;
    expect(validateSettlementCommand(noDigest)).toBe(false);
    expect(validateSettlementCommand({ ...command, expectedDigest: 'x' })).toBe(false);
    for (const amountMinor of ['0', '-1', '01', '1.5', '1e3', ' 1'])
      expect(validateSettlementCommand(withOperation({ ...operations[6], amountMinor }))).toBe(
        false,
      );
    // A linked correction carries a signed nonzero delta; zero and decimals reject.
    for (const amountMinor of ['0', '-0', '1.5'])
      expect(validateSettlementCommand(withOperation({ ...operations[5], amountMinor }))).toBe(
        false,
      );
  });
  it('closes filters and every response view', () => {
    expect(
      validateSettlementCaseFilter({ companyId: id(1), state: 'open', targetKind: 'account' }),
    ).toBe(true);
    expect(validateSettlementCaseFilter({ companyId: id(1), state: 'deleted' })).toBe(false);
    expect(validateSettlementCaseFilter({ companyId: id(1), sql: '1=1' })).toBe(false);
    expect(validateSettlementViews.preview(preview)).toBe(true);
    expect(validateSettlementViews.preview({ ...preview, classification: 'profit' })).toBe(false);
    expect(validateSettlementViews.preview({ ...preview, internalSql: 'x' })).toBe(false);
    const settlementResultFixture = () => ({
      commandId: id(21),
      caseId: id(6),
      caseReference: '1',
      resolutionId: id(22),
      operation: 'product.observe',
      classification: 'stock_observation',
      state: 'resolved',
      preview,
      links: [],
    });
    expect(
      validateSettlementViews.result({
        commandId: id(21),
        caseId: id(6),
        caseReference: '1',
        resolutionId: id(22),
        operation: 'product.observe',
        classification: 'stock_observation',
        state: 'resolved',
        preview,
        links: [
          {
            role: 'result',
            entityKind: 'stock_source',
            entityId: id(23),
            label: 'ملاحظة الجرد',
          },
        ],
      }),
    ).toBe(true);
    expect(
      validateSettlementViews.result({
        ...settlementResultFixture(),
        links: [
          { role: 'result', entityKind: 'finance.money_movement', entityId: id(23), label: 'x' },
        ],
      }),
    ).toBe(false);
    expect(
      validateSettlementViews.error({ code: 'SETTLEMENT_PREVIEW_STALE', correlationId: id(24) }),
    ).toBe(true);
  });
  it('opening batches are closed, classified and never carry profit', () => {
    expect(validateOpeningCommand(opening)).toBe(true);
    expect(
      validateOpeningPrepareInput({
        companyId: id(1),
        openingDate: '2026-10-01',
        lines: opening.lines,
      }),
    ).toBe(true);
    expect(validateOpeningCommand({ ...opening, lines: [] })).toBe(false);
    for (const line of [
      { classification: 'operating_profit', branchId: id(2), amountMinor: '1' },
      { classification: 'account_balance', accountId: id(5), branchId: id(2), amountMinor: '-1' },
      {
        classification: 'stock_sound',
        brandId: id(3),
        variantId: id(4),
        branchId: id(2),
        quantity: 0,
      },
      {
        classification: 'stock_sound',
        brandId: id(3),
        variantId: id(4),
        branchId: id(2),
        amountMinor: '1',
        quantity: 1,
      },
      { ...opening.lines[0], revenueMinor: '1' },
    ])
      expect(validateOpeningCommand({ ...opening, lines: [line] })).toBe(false);
    const { description: _x, ...noDescription } = opening;
    expect(validateOpeningCommand(noDescription)).toBe(false);
  });
  it('publishes every settlement and opening route in OpenAPI', () => {
    const paths = Object.keys((openApi as { paths: Record<string, unknown> }).paths);
    for (const route of [
      '/api/v1/settlements/catalog',
      '/api/v1/settlements/cases',
      '/api/v1/settlements/cases/{caseId}',
      '/api/v1/settlements/prepare',
      '/api/v1/settlements/commands',
      '/api/v1/settlements/commands/{commandId}',
      '/api/v1/settlements/opening/catalog',
      '/api/v1/settlements/opening/batches',
      '/api/v1/settlements/opening/batches/{batchId}',
      '/api/v1/settlements/opening/prepare',
      '/api/v1/settlements/opening/commands',
      '/api/v1/settlements/opening/commands/{commandId}',
    ])
      expect(paths).toContain(route);
  });
});

describe('P21 settlement arithmetic', () => {
  it('A01/A02: observing sound stock writes one signed delta and never forces reservations down', () => {
    expect(
      stockObservation({
        soundOnHand: 12,
        unavailableOnHand: 0,
        reserved: 0,
        condition: 'sound',
        observed: 10,
      }),
    ).toMatchObject({
      recorded: 12,
      delta: -2,
      soundAfter: 10,
      availableAfter: 10,
      shortageAfter: 0,
    });
    expect(
      stockObservation({
        soundOnHand: 7,
        unavailableOnHand: 1,
        reserved: 7,
        condition: 'sound',
        observed: 5,
      }),
    ).toMatchObject({
      delta: -2,
      soundAfter: 5,
      unavailableAfter: 1,
      reserved: 7,
      availableAfter: 0,
      shortageBefore: 0,
      shortageAfter: 2,
    });
    expect(
      stockObservation({
        soundOnHand: 4,
        unavailableOnHand: 2,
        reserved: 0,
        condition: 'unavailable',
        observed: 3,
      }),
    ).toMatchObject({
      delta: 1,
      soundAfter: 4,
      unavailableAfter: 3,
    });
    expect(() =>
      stockObservation({
        soundOnHand: 5,
        unavailableOnHand: 0,
        reserved: 0,
        condition: 'sound',
        observed: 5,
      }),
    ).toThrow('NO_DIFFERENCE');
    expect(() =>
      stockObservation({
        soundOnHand: 5,
        unavailableOnHand: 0,
        reserved: 0,
        condition: 'sound',
        observed: -1,
      }),
    ).toThrow();
    expect(() =>
      stockObservation({
        soundOnHand: 5,
        unavailableOnHand: 0,
        reserved: 0,
        condition: 'sound',
        observed: 1.5,
      }),
    ).toThrow();
  });
  it('A03: a cash shortage holds only the unexplained amount; a later typed expense replaces the hold', () => {
    expect(accountObservation('100000', '90000')).toEqual({
      differenceMinor: '-10000',
      holdMinor: '10000',
      surplusMinor: '0',
    });
    expect(accountObservation('90000', '100000')).toEqual({
      differenceMinor: '10000',
      holdMinor: '0',
      surplusMinor: '10000',
    });
    expect(() => accountObservation('100', '100')).toThrow('NO_DIFFERENCE');
    // Hold 100 before resolution: book 1000, available 900.
    expect(accountPosition('100000', '10000')).toEqual({
      bookMinor: '100000',
      holdMinor: '10000',
      availableMinor: '90000',
      estimatedActualMinor: '90000',
    });
    // Missed expense 100 posted and hold released: book 900, hold 0, available 900 (never 800).
    expect(accountPosition('90000', '0')).toMatchObject({
      bookMinor: '90000',
      availableMinor: '90000',
    });
    // A later genuine movement changes book; the unexplained hold stays the same.
    expect(accountPosition('80000', '10000')).toMatchObject({ availableMinor: '70000' });
    expect(accountPosition('5000', '10000')).toMatchObject({
      availableMinor: '0',
      estimatedActualMinor: '-5000',
    });
  });
  it('linked corrections keep the original class; source deltas are brand-view', () => {
    expect(correctedAmount('10000', '0', '-2500')).toBe('7500');
    expect(correctedAmount('10000', '-2500', '-7500')).toBe('0');
    expect(() => correctedAmount('10000', '0', '-10001')).toThrow('CORRECTION_CHANGES_CLASS');
    expect(() => correctedAmount('-3000', '0', '3001')).toThrow('CORRECTION_CHANGES_CLASS');
    expect(() => correctedAmount('10000', '0', '0')).toThrow('INVALID_CORRECTION_AMOUNT');
    expect(
      sourceReviewDelta(
        { goodsMinor: '20000', feeMinor: '5000' },
        { goodsMinor: '18000', feeMinor: '6000' },
      ),
    ).toEqual({
      goodsDeltaMinor: '-2000',
      feeDeltaMinor: '-1000',
    });
  });
  it('A06: one opening per target; signs never produce operating facts', () => {
    const lines = opening.lines.map((l) => ({ ...l }));
    expect(assertUniqueOpeningTargets(lines)).toEqual([
      'account:' + id(5),
      'brand:' + id(3) + ':brand_eligible_credit',
      'employee:' + id(8) + ':employee_obligation',
      `stock:${id(2)}:${id(3)}:${id(4)}:stock_sound`,
    ]);
    expect(() =>
      assertUniqueOpeningTargets([...lines, { ...lines[0]!, amountMinor: '1' } as never]),
    ).toThrow('DUPLICATE_OPENING_TARGET');
    expect(() => assertUniqueOpeningTargets([])).toThrow('VALIDATION_FAILED');
    // A brand's pending and eligible openings are separate targets.
    expect(
      openingTargetKey({
        classification: 'brand_pending_driver_held',
        brandId: id(3),
        branchId: id(2),
      }),
    ).not.toBe(
      openingTargetKey({
        classification: 'brand_eligible_credit',
        brandId: id(3),
        branchId: id(2),
      }),
    );
    expect(openingSignedMinor('brand_debt', '500')).toBe('-500');
    expect(openingSignedMinor('employee_obligation', '500')).toBe('-500');
    expect(openingSignedMinor('employee_entitlement', '500')).toBe('500');
    expect(() => openingSignedMinor('stock_sound', '1')).toThrow('INVALID_OPENING_CLASSIFICATION');
    expect(() => openingSignedMinor('account_balance', '0')).toThrow();
    expect(journalKinds.brand.adjustment).toBe('signed');
    expect(journalKinds.employee.opening).toBe('signed');
    expect(Object.values(journalKinds).some((kinds) => 'profit' in kinds)).toBe(false);
  });
});

describe('P21 payroll extension', () => {
  const base = (kind: PayrollEarning['kind'], amountMinor: string, n: number): PayrollEarning => ({
    id: id(100 + n),
    kind,
    amountMinor,
    branchId: id(2),
    workDate: '2026-10-01',
    recordedAt: '2026-10-01',
    sourceId: id(200 + n),
    label: kind,
    visitId: null,
    policyId: null,
  });
  const obligation = (amount: string, kind: PayrollObligation['kind']): PayrollObligation => ({
    id: id(300),
    kind,
    sourceId: id(301),
    sourceLabel: 'settlement',
    month: '2026-10',
    effectiveDate: '2026-10-01',
    recordedAt: '2026-10-01',
    branchId: id(2),
    amountMinor: amount,
    outstandingAmount: amount,
    reservedForFrozenPeriods: '0',
    availableForNewAllocation: amount,
  });
  it('an opening entitlement is paid once but is not current employee cost', () => {
    const c = calculatePayroll(
      '2026-10',
      [base('salary', '600000', 1), base('opening_entitlement', '50000', 2)],
      [],
    );
    expect(c).toMatchObject({
      grossEarning: '650000',
      netPayable: '650000',
      employeeCost: '600000',
      openingEntitlement: '50000',
    });
  });
  it('a settlement liability is recovered from net pay without a second employee cost', () => {
    const c = calculatePayroll(
      '2026-10',
      [base('salary', '600000', 1)],
      [obligation('10000', 'settlement')],
    );
    expect(c).toMatchObject({
      netPayable: '590000',
      employeeCost: '600000',
      settlementRecovered: '10000',
      newSettlementObligations: '10000',
    });
    expect(c.allocations).toEqual([
      expect.objectContaining({ kind: 'settlement', amountMinor: '10000' }),
    ]);
  });
  it('a calculation frozen before P21 (without the new keys) remains a valid month view', () => {
    const calculation = calculatePayroll('2026-10', [base('salary', '600000', 1)], []);
    const {
      openingEntitlement: _o,
      newSettlementObligations: _n,
      settlementRecovered: _s,
      ...legacy
    } = calculation;
    const month = {
      employeeId: id(8),
      employeeName: 'موظف',
      branchId: id(2),
      month: '2026-10',
      currentMonth: '2026-10',
      state: 'editable_unpaid',
      version: 1,
      digest: 'a'.repeat(64),
      frozenAt: null,
      earnings: [base('salary', '600000', 1)],
      obligations: [],
      reviews: [],
      blockers: [],
      payment: null,
    };
    expect(validatePayrollMonth({ ...month, calculation: legacy })).toBe(true);
    expect(validatePayrollMonth({ ...month, calculation })).toBe(true);
  });
});
