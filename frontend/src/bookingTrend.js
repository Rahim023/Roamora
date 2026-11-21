export function bookingTrend(records, currency, months, now = new Date()) {
  const amounts = new Map(
    records.filter((record) => record.currency === currency).map((record) => [record.period, record.amountMinor / 100]),
  );
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + index + 1, 1));
    const period = date.toISOString().slice(0, 7);
    return {
      period,
      month: date.toLocaleDateString('en-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      value: amounts.get(period) ?? 0,
    };
  });
}
