# ERP Finance Reference Notes

Reviewed: 2026-10-01, discovery session 011.

Owner-policy overlay updated: 2026-10-02, session 013. The source inspection date and coverage below are unchanged.

The owner explicitly requested focused ERP-V2 review of expenses, branch/user selection, treasuries, transfers, deposits and withdrawals. Public main was observed at `7254e34b49acfbe394da3a889abe6e458084cb38`, unchanged from the previous focused reference review. This is reference source evidence, not a new ERP implementation, adopted stack, runtime audit or Tawsel baseline upgrade.

## Expenses and branch attribution

The expense page reloads when active branch changes and offers description search, date filtering, paginated records and a separate entry modal. The modal collects date, description, positive amount, treasury, payment method and category, with quick category creation. The reference payment choices are CASH/CARD; the ERP owner's Cash/Bank deposit/InstaPay choices take precedence. Sources: [ExpensesPage.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/expenses/ExpensesPage.jsx), [AddExpenseModal.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/expenses/AddExpenseModal.jsx).

The separate expense report has period, branch, category and payment-method filters, totals, counts, category breakdown, category-by-branch breakdown, details and print action. This supports the owner's explicit expense-report addition. The selected ERP report formats remain screen, Excel and print/PDF; source inspection does not prove export/RTL quality. Source: [ExpenseAnalysisReport.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/reports/history/ExpenseAnalysisReport.jsx).

The expense API protects the route module, filters account lookups/list/report via branch logic and checks funds before recording the expense/decrement. Expense branch display is derived from the treasury relation; creation does not accept a distinct expense-ownership branch. Its update/delete paths modify or remove records and restore/reapply treasury amounts. These behaviors are not adopted as the ERP correction policy. Source: [expenses.js](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/routes/expenses.js).

**Owner rule / design implication:** ERP-D-113 explicitly requires sole-assigned-branch default or a permitted-branch choice. Persist that business branch independently from the payment account, particularly when the company bank account is shared. Apply the existing scope rules to reads, writes and exports. Do not infer a correctly authorized write merely from a filtered account selector. ERP-D-129 now accepts maintained addable expense categories; ERP-D-130 allows past actual payment dates with entry timestamp/actor retained.

## Accounts and branch selection

The treasury setup screen has name, numeric display ID and save/close or save/add-another. Selected branch setup/schema sections link a branch to a unique treasury and a warehouse. The reference scopes include BRANCH_CASH, MAIN, GLOBAL_VISA and GLOBAL_INSTAPAY. This does not establish a generic bank-account module. Owner-approved named bank accounts and InstaPay as a method retain their own ERP design. Sources: [TreasuryManager.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/treasuries/TreasuryManager.jsx), [schema.prisma](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/prisma/schema.prisma#L316-L385).

Single-branch users have static branch display; multi-branch users have a picker. Reference context persists the active choice per user. Named global roles receive broader selection; the ERP's existing modular/assigned-resource rules take precedence. Selected backend resolver functions validate operating-branch access or build allowed-branch filters, but not every financial mutation calls those functions. Sources: [BranchContext.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/contexts/BranchContext.jsx), [BranchSwitcher.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/components/BranchSwitcher.jsx), [auth.js](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/middleware/auth.js#L399-L553).

## Transfers

The creation page displays source, destination, source balance, amount and optional notes. Management filters ALL/PENDING/APPROVED/REJECTED and shows route, date, amount, notes and accept/reject actions. Submitting debits the source and records PENDING; approval credits the destination; rejection refunds the source in the reference. Source selection is narrower than destination selection. These are observations, not selected ERP policies. Sources: [CashierTransferPage.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/treasuries/CashierTransferPage.jsx), [TransferManagementPage.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/treasuries/TransferManagementPage.jsx), [treasuries.js](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/routes/treasuries.js#L146-L317).

ERP-D-126/127 select separate sending/receipt-confirmation screens and any-company-branch source/destination selection on creation. ERP-D-135 now grants any-company-branch receipt confirmation through the separately permissioned receipt screen. These are specific screen exceptions to ordinary branch scope. ERP-D-136 accepts full-value transfer receipt only and excludes short-transfer processing. Keep in-transit funds separate from confirmed receipt. No cancellation/return workflow or automatic source refund is approved merely because the reference has a reject action; rejection does not prove physical return. Transfers do not create operating revenue/expense.

## Deposits and withdrawals

The reference uses one combined history page and two add modals. Fields are treasury, date, description and amount. History shows direction, creator and amount and supports description/treasury search and a date filter. The forms default to the first available treasury; this is not equivalent to explicit branch selection. Source: [DepositPage.jsx](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/frontend/src/pages/deposits/DepositPage.jsx).

Deposit increases the treasury balance; withdrawal decreases it after a funds check. Form examples include funding, loans, cash withdrawal or an expense, but the handlers lack structured financial purpose. ERP-D-128 selects deposit/withdrawal direction with optional free-text reason and rejects mandatory purpose categories. ERP-D-134 now explicitly excludes these generic movements from operating profit. Dedicated expense, payroll, brand payout, remittance and transfer postings must not be entered again. A positive treasury movement is not automatically income. Sources: [deposits.js](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/routes/deposits.js), [withdrawals.js](https://github.com/7ossam26/ERP-V2/blob/7254e34b49acfbe394da3a889abe6e458084cb38/backend/routes/withdrawals.js).

## Differences and verification limits

- Do not inherit POS shift prerequisites, hardcoded Manager/Admin privileges, Visa support or unrestricted account visibility. The owner explicitly grants transfer creation across company branches in ERP-D-127 and receipt confirmation across company branches in ERP-D-135; expense and other module scope remain as agreed. Choosing a source/destination account is not an all-branches aggregate posting target.
- Treasury transfer handlers observed in the reviewed file have authentication without equivalent operation-level branch predicates. Deposit/withdrawal routes have named permission checks but no handler-level branch ownership filtering. The existence of branch helper functions is not proof of their use in every route. This is a bounded source observation, not a complete security audit.
- Expense record update/delete behavior conflicts with the owner's accepted linked correction/reversal history. Retain ERP-D-119 and protected HR periods.
- Read-then-write balance checks and reference transactions do not prove concurrent-spend safety. Plan real database checks for balances, transfers, movement identity and corrections; none was run here.
- Paid-only manual expense capture under ERP-D-114 qualifies the desired period-profit report. Do not import unpaid expense/AP workflows, or claim costs the ERP does not record are included.

## Exact reading ledger

### Primary agent: complete files

| File | Lines read |
| --- | --- |
| frontend/src/pages/expenses/ExpensesPage.jsx | 1-527 |
| frontend/src/pages/expenses/AddExpenseModal.jsx | 1-279 |
| frontend/src/pages/reports/history/ExpenseAnalysisReport.jsx | 1-391; a truncated combined output was followed by a targeted reread covering the omitted filter section |
| backend/routes/expenses.js | 1-433 |
| frontend/src/contexts/BranchContext.jsx | 1-170 |
| frontend/src/utils/BranchFilterHelper.js | 1-98 |

### Delegated read-only review: complete files

| File | Lines read |
| --- | --- |
| frontend/src/pages/treasuries/TreasuryManager.jsx | 1-155 |
| frontend/src/pages/treasuries/CashierTransferPage.jsx | 1-324 |
| frontend/src/pages/treasuries/TransferManagementPage.jsx | 1-250 |
| frontend/src/pages/deposits/DepositPage.jsx | 1-302 |
| frontend/src/pages/deposits/AddDepositModal.jsx | 1-152 |
| frontend/src/pages/deposits/AddWithdrawalModal.jsx | 1-152 |
| frontend/src/contexts/BranchContext.jsx | 1-170 |
| frontend/src/components/BranchSwitcher.jsx | 1-106 |
| frontend/src/utils/treasuryScope.js | 1-24 |
| backend/routes/treasuries.js | 1-376 |
| backend/routes/deposits.js | 1-85 |
| backend/routes/withdrawals.js | 1-88 |

### Delegated review: selected sections only

| File | Sections read |
| --- | --- |
| backend/middleware/auth.js | 399-553, complete resolveOperatingBranch/getUserBranchFilter functions |
| backend/routes/branches.js | 1-59 and 594-696 |
| frontend/src/pages/branches/BranchManager.jsx | 6-54 and 176-201 |
| backend/prisma/schema.prisma | 15-58, 316-402, 810-839 and 1003-1065 |

No full user-management API, settings screens, branch balance report or HTTP client/interceptor review was performed. No app was installed or run; no transactions, tests, reference-repository changes or new contract adoption occurred. Public-source copies used for reading were temporary files outside the ERP documentation workspace.

## Session 012 owner-policy overlay

Historical snapshot recorded 2026-10-02; the source inspection above remains dated 2026-10-01, not a fresh repository review. ERP-D-126 through ERP-D-133 settled receipt separation, company-wide creation authority, optional generic-movement reason, addable categories, expense backdating, employee-cost branch attribution and pending cash discrepancies. At that session, receipt reach, incomplete/returned transfer rules, generic cash profit treatment and exact source formulas remained under discovery. No mandatory second person, automatic rejection refund or automatic loss/penalty was approved. The session 013 overlay governs the latest answers.

## Session 013 owner-policy overlay

Recorded 2026-10-02. These are current ERP owner choices, not new ERP-V2 source findings or an adopted implementation.

- ERP-D-134 / ERP-R-143: generic deposits/withdrawals affect account balance and history only; they do not enter operating profit. Keep direction and optional free-text reason, without compulsory purpose categories. Operating expenses use the Expenses workflow once.
- ERP-D-135/136 / ERP-R-144/145: the receipt-confirmation screen may confirm transfers for any company branch. Confirm only the fixed full amount; short-transfer processing is excluded. The reference's automatic refund on rejection remains unapproved. Creation and receipt permissions are separate, without a mandatory second human.
- ERP-D-137 / ERP-R-146: brand payout weekdays are scheduling guidance. Authorized screen users may pay on another day with a reason, subject to eligible balance and company funds.
- ERP-D-138 / ERP-R-147 explicitly supersede ERP-D-056 / ERP-R-057. Driver remittance must equal the complete reported recipient money after the round. The owner excludes partial remittance, allocation priorities and personal-shortage resolution from ERP. Missing money must not be marked received; the driver covers the shortage outside ERP before full confirmation. Treasury/account discrepancy review under ERP-D-133 remains distinct, and partial brand payouts remain allowed.
- ERP-D-139 through ERP-D-141 / ERP-R-148 through ERP-R-150: overdue storage remains visible while work continues until an authorized explicit stop; do not offset the brand payout wallet automatically. Stopping prevents the next renewal and preserves the paid period without an automatic prorated refund. A revised price begins next period. Keep actual payment separate from period renewal and revenue.
- ERP-D-142 / ERP-R-151: one complete driver remittance may combine Cash, Bank deposit and InstaPay. Component amounts sum to the full expected amount and identify actual destination accounts. Record optional references without proof images; no bank/InstaPay API or automatic verification is inferred.
- ERP-D-143 / ERP-R-152: operating profit uses earned shipping including packing uplift and storage service-period revenue, subtracts gross employee costs before advance recovery, paid manual expenses and confirmed compensation, and includes approved employee compensation recovery once. The accepted 10,000 + 2,000 - 4,000 - 1,500 - 500 + 200 example totals 6,200. Brand money, funding/transfers, advances and net payouts are not additional revenue/cost. Preserve the separate cash view and the paid-only ordinary-expense limitation.
- ERP-D-144/145 / ERP-R-153/154: ERP operations wait for internet connectivity; apply ACID to local database transactions. Reference code does not prove those properties. Real database verification and durable outbox/inbox, idempotency and reconciliation remain required; no distributed atomic commit with Tawsel is claimed.

The source review remains the bounded 2026-10-01 reading ledger above. No source reinspection, application run, money movement, runtime test, baseline change or final architecture selection occurred in this policy update.
