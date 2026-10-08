import { RecoveryWorker } from '@shahn/api/integration';
export class ReconciliationJob extends RecoveryWorker {
  override runOne() {
    return super.runOne('reconcile');
  }
}
