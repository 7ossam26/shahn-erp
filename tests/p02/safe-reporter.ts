import type { Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter';
function sanitize(error: TestError) {
  for (const field of ['message', 'stack', 'value'] as const) {
    if (error[field])
      error[field] = error[field].replace(
        /([?&](?:session_code|execution|tab_id|client_data|state|nonce|code_challenge|code)=)[^&\s"\\<>]+/g,
        '$1[REDACTED_AUTH_PARAMETER]',
      );
  }
}
export default class SafeReporter implements Reporter {
  onTestEnd(_test: TestCase, result: TestResult) {
    result.errors.forEach(sanitize);
    if (result.error) sanitize(result.error);
  }
  onError(error: TestError) {
    sanitize(error);
  }
}
