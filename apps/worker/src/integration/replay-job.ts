import { RecoveryWorker } from '@shahn/api/integration';
export class ReplayJob extends RecoveryWorker {
  override runOne() {
    return super.runOne('replay');
  }
}
