/** Official DeepSeek pricing and Beijing calendar, verified 2026-10-18. */
const HOLIDAY_DATES = new Set();
for (const [month, first, last] of [[1,1,3],[2,15,23],[4,4,6],[5,1,5],[6,19,21],[9,25,27],[10,1,7]]) {
  for (let day = first; day <= last; day++) HOLIDAY_DATES.add(`2026-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
}

export function beijingDay(time = Date.now()) { return new Date(time + 28800000).toISOString().slice(0,10); }

export function pricingPeriod(time = Date.now()) {
  const date = new Date(time + 28800000);
  const day = date.toISOString().slice(0,10);
  const weekend = [0,6].includes(date.getUTCDay());
  const known = date.getUTCFullYear() === 2026;
  const hour = date.getUTCHours();
  const peak = !weekend && !HOLIDAY_DATES.has(day) && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18));
  return { kind: !known && !weekend ? 'unknown' : peak ? 'peak' : 'valley', calendarKnown: known };
}

export function periodInfo(time = Date.now()) {
  const current = pricingPeriod(time);
  let nextAt = null;
  if (current.kind !== 'unknown') {
    const dayStart = Date.parse(beijingDay(time) + 'T00:00:00+08:00');
    outer: for (let d = 0; d <= 16; d++) {
      for (const hour of [0,9,12,14,18]) {
        const at = dayStart + d * 86400000 + hour * 3600000;
        if (at <= time) continue;
        const candidate = pricingPeriod(at);
        if (candidate.kind === 'unknown') break outer;
        if (candidate.kind !== current.kind) { nextAt = at; break outer; }
      }
    }
  }
  return { ...current, nextAt };
}

export function countdown(until, now = Date.now()) {
  if (!until) return '—';
  const minutes = Math.max(1, Math.ceil((until - now) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** DSH uncached input excludes cache reads/writes; reasoning is already in output. */
export function estimateUsage(model, usage, time = Date.now()) {
  const name = String(model || '').toLowerCase();
  const flash = ['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'].includes(name);
  const pro = name === 'deepseek-v4-pro';
  const period = pricingPeriod(time).kind;
  if ((!flash && !pro) || period === 'unknown' || time < Date.parse('2026-09-10T04:00:00Z')) return null;
  const count = key => usage[key] === undefined ? 0 : usage[key];
  for (const key of ['inputTokens','outputTokens','cacheReadTokens','cacheWriteTokens','reasoningTokens']) {
    if (!Number.isSafeInteger(count(key)) || count(key) < 0) return null;
  }
  const input = count('inputTokens') + count('cacheWriteTokens');
  const cache = count('cacheReadTokens');
  const output = count('outputTokens');
  if (!Number.isSafeInteger(input + cache + output)) return null;
  // Units are 1e-8 CNY. Price constants are per million tokens, in the same units.
  const rates = pro ? [15000000n,450000000n,1350000000n] : [2000000n,100000000n,400000000n];
  const factor = period === 'peak' ? 2n : 1n;
  const units = ((BigInt(cache)*rates[0] + BigInt(input)*rates[1] + BigInt(output)*rates[2]) * factor + 500000n) / 1000000n;
  const digits = units.toString().padStart(9,'0');
  return { cost: digits.slice(0,-8)+'.'+digits.slice(-8), tokens: input+cache+output, input, cache, output, period };
}
