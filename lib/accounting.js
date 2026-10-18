import { decimal, sumMoney } from './model.js';
import { beijingDay, estimateUsage } from './pricing.js';

export function unitsOf(value) {
  const number = decimal(value);
  return number.scale <= 8 ? number.units * 10n ** BigInt(8-number.scale)
    : number.units / 10n ** BigInt(number.scale-8);
}
export function moneyOf(units) {
  const sign = units < 0n ? '-' : '';
  const digits = (units < 0n ? -units : units).toString().padStart(9,'0');
  return sign + digits.slice(0,-8)+'.'+digits.slice(-8);
}
export function newLedger() { return { version: 1, books: {}, turns: [], seen: {}, estimateDays: {}, seq: 0 }; }

/** Account/key identities and currencies keep independent observation baselines. */
export function observe(ledger, scope, source, balances, time = Date.now()) {
  if (!scope) return;
  const book = ledger.books[scope] ??= { source, currencies: {} };
  for (const balance of balances) {
    const day = beijingDay(time);
    const currency = book.currencies[balance.currency] ??= { last: null, lastAt: null, days: {} };
    const current = unitsOf(balance.total);
    const isNewDay = !currency.days[day];
    const row = currency.days[day] ??= { spent: '0.00000000', credits: '0.00000000', firstAt: time, lastAt: time, review: false, partial: true, corrected: false };
    if (!isNewDay && currency.lastAt !== null && time >= currency.lastAt) {
      const difference = unitsOf(currency.last) - current;
      if (difference > 0n) row.spent = sumMoney([row.spent, moneyOf(difference)]);
      if (difference < 0n) { row.credits = sumMoney([row.credits, moneyOf(-difference)]); row.review = true; }
      if (time - currency.lastAt > 600000) row.partial = true;
    }
    // A delayed result can never replace a newer baseline.
    if (currency.lastAt === null || time >= currency.lastAt) {
      currency.last = balance.total; currency.lastAt = time; row.lastAt = time;
    }
    for (const oldDay of Object.keys(currency.days)) if (oldDay < beijingDay(time - 365*86400000)) delete currency.days[oldDay];
  }
}

export function reconcile(ledger, scope, currency, day, amount) {
  if (unitsOf(amount) < 0n) throw new Error('invalid-request');
  const row = ledger.books[scope]?.currencies[currency]?.days[day];
  if (!row) throw new Error('invalid-request');
  row.spent = moneyOf(unitsOf(amount)); row.review = false; row.corrected = true;
}

/** Only finalized assistant usage events are counted; live chunks and replayed sequence ids are ignored. */
export function recordEvent(ledger, sessionId, event) {
  if (event?.type !== 'assistant/message' || !event.data?.usage || !Number.isSafeInteger(event.seq)) return false;
  if (event.seq <= (ledger.seen[sessionId] ?? -1)) return false;
  ledger.seen[sessionId] = event.seq;
  const data = event.data;
  const model = data.message?.source?.model;
  if (!['deepseek-official','deepseek-account'].includes(data.message?.source?.provider)) return false;
  const time = event.time;
  if (!Number.isFinite(time) || !Number.isSafeInteger(data.turn)) return false;
  const estimate = estimateUsage(model, data.usage, time);
  if (!estimate) return false;
  let row = ledger.turns.find(row => row.sessionId === sessionId && row.turn === data.turn);
  if (!row) {
    row = { sessionId, turn: data.turn, at: time, cost: '0.00000000', tokens: 0, models: [], seq: ++ledger.seq, complete: false };
    ledger.turns.push(row);
  }
  row.at = Math.max(row.at,time); row.cost = sumMoney([row.cost,estimate.cost]); row.tokens += estimate.tokens;
  const day = beijingDay(time);
  ledger.estimateDays ??= {};
  ledger.estimateDays[day] = sumMoney([ledger.estimateDays[day] ?? '0.00000000',estimate.cost]);
  for (const oldDay of Object.keys(ledger.estimateDays)) if (oldDay < beijingDay(time-365*86400000)) delete ledger.estimateDays[oldDay];
  if (!row.models.includes(model)) row.models.push(model);
  ledger.turns = ledger.turns.slice(-2000).filter(row => row.at >= time - 90*86400000);
  const activeSessions = new Set(ledger.turns.map(row => row.sessionId));
  for (const key of Object.keys(ledger.seen)) if (!activeSessions.has(key)) delete ledger.seen[key];
  return true;
}

export function finishTurn(ledger, sessionId, event) {
  if (event?.type !== 'turn/end') return;
  const row = ledger.turns.find(row => row.sessionId === sessionId && row.turn === event.data?.turn);
  if (row && !row.complete) { row.complete = true; row.completedAt = event.time ?? row.at; row.noticeSeq = ++ledger.seq; }
}

export function summary(ledger, scope, time = Date.now()) {
  const day = beijingDay(time);
  const days = Array.from({length:7}, (_,i) => beijingDay(time-i*86400000));
  const book = ledger.books[scope];
  const currencies = Object.entries(book?.currencies ?? {}).map(([currency, book]) => {
    const history = days.map(date => ({ date, ...(book.days[date] ?? { spent: '0.00000000', credits: '0.00000000', partial: true, missing: true }) }));
    return { currency, today: history[0], history, total7: sumMoney(history.map(row => row.spent)) };
  });
  const turns = ledger.turns.slice().sort((a,b)=>b.at-a.at || b.seq-a.seq);
  const lastTurn = ledger.turns.filter(row=>row.complete).sort((a,b)=>(b.noticeSeq??0)-(a.noticeSeq??0))[0] ?? null;
  return { day, bookId: scope, currencies, turns: turns.slice(0,50), totalEstimatedToday: ledger.estimateDays?.[day] ?? '0.00000000', lastTurn };
}
