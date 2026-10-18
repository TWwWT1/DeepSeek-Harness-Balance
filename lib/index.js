import { accountBalances, apiBalances } from './model.js';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { LedgerStore } from './store.js';
import { observe, recordEvent, finishTurn, summary, reconcile } from './accounting.js';

const ENDPOINT = 'local-balance/read';
const hashId = (source, value) => source + ':' + createHash('sha256').update(value).digest('hex').slice(0,24);
export const inject = ['connection', 'credentials'];

/** Read via Harness services. Credentials never enter client responses or logs. */
export async function readBalance(ctx, request, signal, doFetch = globalThis.fetch) {
  const source = request?.source;
  if (!['auto', 'account', 'api-key'].includes(source)) return { status: 'error', code: 'invalid-request' };
  const account = ctx.get('deepseekAccount');
  if (source !== 'api-key' && account) {
    const state = await account.getState();
    if (state.status === 'credential-stored') {
      const before = typeof account.getPlatformSession === 'function' ? await account.getPlatformSession() : null;
      const result = await account.getBalance({
        version: '0.2.1-rc.2',
        locale: request.locale === 'en' ? 'en' : 'zh',
        timezoneOffsetSeconds: Number.isInteger(request.timezoneOffsetSeconds) && Math.abs(request.timezoneOffsetSeconds) <= 50400
          ? request.timezoneOffsetSeconds : 0,
      });
      if (signal.aborted) throw signal.reason;
      if (result === null) return { status: 'empty', code: 'signed-out' };
      if (result.status !== 'ready') return { status: 'error', code: 'account-failed' };
      const identity = typeof account.getPlatformSession === 'function' ? await account.getPlatformSession() : null;
      if (identity?.origin !== before?.origin || identity?.token !== before?.token) return { status: 'empty', code: 'signed-out' };
      const bookId = identity ? hashId('account', identity.origin + ':' + (identity.userId ?? identity.token)) : null;
      return { status: 'ready', source: 'account', balances: accountBalances(result), updatedAt: Date.now(), _bookId: bookId };
    }
  }
  if (source === 'account') return { status: 'empty', code: 'signed-out' };
  const credential = await ctx.credentials.resolve('DEEPSEEK_API_KEY');
  if (!credential?.value) return { status: 'empty', code: 'unconfigured' };
  const response = await doFetch('https://api.deepseek.com/user/balance', {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${credential.value}` },
    redirect: 'error', cache: 'no-store', signal,
  });
  if (!response.ok) {
    const code = response.status === 401 ? 'invalid-key' : response.status === 429 ? 'rate-limit' : 'api-failed';
    return { status: 'error', code };
  }
  const data = await response.json();
  return { status: 'ready', source: 'api-key', balances: apiBalances(data), available: data.is_available, updatedAt: Date.now(), _bookId: hashId('api', credential.value) };
}

export function apply(ctx) {
  const lifetime = new AbortController();
  const store = new LedgerStore(join(process.env.DSH_HOME || join(homedir(),'.dsh'),'balance-card','ledger-v1.json'));
  let storageError = false;
  ctx.effect(() => async () => { lifetime.abort(); await store.pending.catch(() => {}); }, 'balance-card: requests and accounting writes');
  ctx.on('session/event', (session,event) => {
    if (!['assistant/message','turn/end'].includes(event?.type)) return;
    void store.transact(ledger => {
      recordEvent(ledger, String(session.id), event);
      finishTurn(ledger, String(session.id), event);
    }).catch(() => { storageError = true; });
  });
  // Connection authenticates this route and admits owner Peers only, including on Desktop IPC.
  const handle = endpoint => async request => {
    let envelope;
    try { envelope = await request.json(); }
    catch (error) { return new Response('Invalid JSON', { status: 400 }); }
    if (envelope?.type !== 'client-request' || envelope.method !== endpoint || typeof envelope.rpcId !== 'string') return new Response('Invalid request', { status: 400 });
    const respond = value => Response.json({ type: 'server-response', rpcId: envelope.rpcId, result: { ok: true, value } }, { headers: { 'Cache-Control': 'no-store' } });
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new Error('timeout')), 15000);
    const signal = AbortSignal.any([request.signal, lifetime.signal, timeout.signal]);
    let abort;
    try {
      if (endpoint !== ENDPOINT) {
        const payload = envelope.payload;
        if (!payload || (payload.bookId !== null && !/^(?:api|account):[a-f0-9]{24}$/.test(payload.bookId))) throw new Error('invalid-request');
        const result = await store.transact(ledger => {
          if (endpoint === 'local-balance/reconcile') {
            if (!['CNY','USD'].includes(payload.currency) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.day) || typeof payload.amount !== 'string' || !/^\d{1,12}(?:\.\d{1,8})?$/.test(payload.amount)) throw new Error('invalid-request');
            reconcile(ledger,payload.bookId,payload.currency,payload.day,payload.amount);
          }
          return summary(ledger,payload.bookId);
        }, { write: endpoint === 'local-balance/reconcile' });
        return respond({ status: 'ready', accounting: result, storageError });
      }
      const cancelled = new Promise((_, reject) => {
        abort = () => reject(new Error('cancelled'));
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
      const result = await Promise.race([readBalance(ctx, envelope.payload, signal), cancelled]);
      if (result.status !== 'ready') return respond(result);
      const { _bookId, ...balance } = result;
      try {
        const accounting = await store.transact(ledger => {
          observe(ledger,_bookId,balance.source,balance.balances,balance.updatedAt);
          return summary(ledger,_bookId);
        });
        storageError = false;
        return respond({ ...balance, accounting });
      } catch (error) { storageError = true; return respond({ ...balance, storageError: true }); }
    } catch (error) {
      const code = timeout.signal.aborted ? 'timeout' : ['invalid-request','storage'].includes(error?.message) ? error.message : error?.message === 'protocol' || error instanceof SyntaxError ? 'protocol' : 'network';
      return respond({ status: 'error', code });
    } finally {
      clearTimeout(timer);
      if (abort) signal.removeEventListener('abort', abort);
    }
  };
  for (const endpoint of [ENDPOINT,'local-balance/summary','local-balance/reconcile']) {
    ctx.connection.fetch.register({ path: '/api/' + endpoint, methods: ['POST'], requestBody: 'buffered', fetch: handle(endpoint) });
  }
}
