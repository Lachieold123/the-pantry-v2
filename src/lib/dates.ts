// Dates as the cook reads them: "Tuesday 29 September".
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function longDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

/** A week as a short range: "28 Sep – 4 Oct", or "5 – 11 Oct" within one month. */
export function weekRange(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const endText = `${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}`;
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${endText}`
    : `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]} – ${endText}`;
}

/** "Wednesday". */
export function weekdayName(d: Date): string {
  return DAYS[d.getDay()] ?? '';
}

/** "30 Sep". */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}
