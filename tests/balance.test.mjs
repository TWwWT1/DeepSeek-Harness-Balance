import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumMoney, formatMoney, accountBalances, apiBalances, lowBalance } from '../lib/model.js';
import { readBalance, apply } from '../lib/index.js';

const sample = { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' }] };
const context = (options = {}) => ({
  get: () => options.account,
  credentials: { resolve: async ref => { assert.equal(ref, 'DEEPSEEK_API_KEY'); return options.key ? { value: options.key } : undefined; } },
});
const request = { source: 'auto', locale: 'zh', timezoneOffsetSeconds: 28800 };
const signal = () => new AbortController().signal;

test('sums and formats decimal money without floating point loss', () => {
  assert.equal(sumMoney(['0.1', '0.2']), '0.3');
  assert.equal(sumMoney(['999999999999999999.12', '0.01']), '999999999999999999.13');
  assert.equal(formatMoney('0.009', 'CNY'), '<¥0.01');
  assert.equal(formatMoney('1234.567', 'USD'), '$1,234.56');
  assert.equal(formatMoney('-2.125', 'USD'), '−$2.12');
  assert.equal(formatMoney('0', 'CNY'), '¥0.00');
  assert.equal(lowBalance('5.0001', 'CNY'), false);
  assert.equal(lowBalance('1', 'USD'), true);
});

test('keeps currencies separate and includes promotional-only wallets', () => {
  const balances = accountBalances({ status: 'ready', value: [{ currency: 'CNY', balance: '10.10' }], bonusWallets: [{ currency: 'CNY', balance: '0.20' }, { currency: 'USD', balance: '3' }] });
  assert.deepEqual(balances, [{ currency: 'CNY', toppedUp: '10.10', granted: '0.20', total: '10.30' }, { currency: 'USD', toppedUp: '0', granted: '3', total: '3' }]);
});

test('rejects malformed and empty provider responses instead of showing zero', () => {
  for (const bad of [undefined, {}, { is_available: true, balance_infos: [] }, { ...sample, balance_infos: [...sample.balance_infos, ...sample.balance_infos] }]) assert.throws(() => apiBalances(bad), /protocol/);
  assert.throws(() => accountBalances({ status: 'ready', value: [], bonusWallets: [] }), /protocol/);
  assert.throws(() => sumMoney(['NaN']), /protocol/);
  assert.throws(() => sumMoney(['1e10']), /protocol/);
});

test('prefers the signed-in account and never sends an API key for that source', async () => {
  let identity;
  const ctx = context({ key: 'secret-key', account: {
    getState: async () => ({ status: 'credential-stored' }),
    getBalance: async client => { identity = client; return { status: 'ready', value: [{ currency: 'CNY', balance: '4' }], bonusWallets: [{ currency: 'CNY', balance: '6' }] }; },
  } });
  const result = await readBalance(ctx, request, signal(), () => { throw new Error('unexpected fetch'); });
  assert.equal(result.source, 'account');
  assert.equal(result.balances[0].total, '10');
  assert.equal(identity.timezoneOffsetSeconds, 28800);
  assert.equal(JSON.stringify(result).includes('secret-key'), false);
});

test('uses only the official endpoint and disables redirects for API credentials', async () => {
  const result = await readBalance(context({ key: 'fixture-key' }), request, signal(), async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/user/balance');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer fixture-key');
    return Response.json(sample);
  });
  assert.equal(result.source, 'api-key');
  assert.equal(result.balances[0].total, '110.00');
  assert.equal(JSON.stringify(result).includes('fixture-key'), false);
});

test('explicit API key mode bypasses a different signed-in account', async () => {
  const ctx = context({ key: 'test', account: { getState: () => { throw new Error('should not read account'); } } });
  assert.equal((await readBalance(ctx, { source: 'api-key' }, signal(), async () => Response.json(sample))).source, 'api-key');
});

test('never silently changes account after an account query failure', async () => {
  const ctx = context({ key: 'test', account: { getState: async () => ({ status: 'credential-stored' }), getBalance: async () => ({ status: 'failed' }) } });
  const result = await readBalance(ctx, request, signal(), () => { throw new Error('unexpected fallback'); });
  assert.deepEqual(result, { status: 'error', code: 'account-failed' });
});

test('reports missing login or credentials without issuing API calls', async () => {
  assert.deepEqual(await readBalance(context(), request, signal()), { status: 'empty', code: 'unconfigured' });
  assert.deepEqual(await readBalance(context({ key: 'test' }), { source: 'account' }, signal()), { status: 'empty', code: 'signed-out' });
});

test('shows auth and rate-limit errors without returning server bodies', async () => {
  for (const [status, code] of [[401, 'invalid-key'], [429, 'rate-limit'], [503, 'api-failed']]) {
    assert.deepEqual(await readBalance(context({ key: 'secret' }), request, signal(), async () => new Response('sensitive error body', { status })), { status: 'error', code });
  }
});

test('refuses invalid source values', async () => {
  assert.deepEqual(await readBalance(context(), { source: 'https://attacker.invalid' }, signal()), { status: 'error', code: 'invalid-request' });
});

test('initial profile identity discovery does not pretend the user signed out', async () => {
  let reads=0;
  const account={
    getState:async()=>({status:'credential-stored'}),
    getPlatformSession:async()=>({origin:'https://platform.deepseek.com',token:'fixture-token',userId:reads++===0?null:'user-1'}),
    getBalance:async()=>({status:'ready',value:[{currency:'CNY',balance:'1'}],bonusWallets:[]}),
  };
  const result=await readBalance(context({account}),request,signal());
  assert.equal(result.status,'ready');
  assert.equal(JSON.stringify(result).includes('fixture-token'),false);
});

test('a grant changed during a balance request cannot be assigned to the replacement account', async () => {
  let reads=0;
  const account={
    getState:async()=>({status:'credential-stored'}),
    getPlatformSession:async()=>({origin:'https://platform.deepseek.com',token:'fixture-token-'+reads++,userId:'user-1'}),
    getBalance:async()=>({status:'ready',value:[{currency:'CNY',balance:'1'}],bonusWallets:[]}),
  };
  assert.deepEqual(await readBalance(context({account}),request,signal()),{status:'empty',code:'signed-out'});
});

test('Host uses an authenticated exact route, correlates RPC, and disposes pending work', async () => {
  let route;
  let cleanup;
  const ctx = { ...context(), on: () => {}, effect: fn => { cleanup = fn(); }, connection: { fetch: { register: value => {
    if (value.path === '/api/local-balance/read') route = value;
  } } } };
  apply(ctx);
  assert.equal(route.path, '/api/local-balance/read');
  assert.deepEqual(route.methods, ['POST']);
  const call = () => route.fetch(new Request('http://localhost/api/local-balance/read', { method: 'POST', body: JSON.stringify({ type: 'client-request', method: 'local-balance/read', rpcId: 'id-1', payload: request }) }));
  const response = await call();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { type: 'server-response', rpcId: 'id-1', result: { ok: true, value: { status: 'empty', code: 'unconfigured' } } });
  assert.equal((await route.fetch(new Request('http://localhost/api/local-balance/read', { method: 'POST', body: '{}' }))).status, 400);
  await cleanup();
  assert.equal((await (await call()).json()).result.value.status, 'error');
});
