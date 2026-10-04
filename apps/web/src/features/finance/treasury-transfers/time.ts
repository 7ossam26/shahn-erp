/** User input is always Cairo local time, independently of the browser's timezone. */
export const cairoInput = (date = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(' ', 'T');
export function cairoTimestamp(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw Error('INVALID_ACTUAL_TIME');
  const local = Date.parse(input + 'Z');
  let guess = local;
  for (let i = 0; i < 4; i++) {
    const rendered = cairoInput(new Date(guess));
    if (rendered === input) return new Date(guess).toISOString();
    guess += local - Date.parse(rendered + 'Z');
  }
  throw Error('INVALID_ACTUAL_TIME');
}
