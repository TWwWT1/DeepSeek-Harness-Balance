const React = require('react');
const { createPortal } = require('react-dom');
const h = React.createElement;
const { useState, useSyncExternalStore, useEffect, useLayoutEffect, useRef } = React;
const inject = ['slots', 'locale', 'connection', 'remote', 'remote.account'];
const NS = 'localBalanceCard';
const STORAGE = 'dsh-balance-card-local.preferences.v1';
const zh = {
  title: 'DeepSeek 余额', shortTitle: '余额', total: '可用余额', paid: '充值', gift: '赠送', refresh: '刷新余额',
  details: '查看明细', close: '收起明细', loading: '正在查询…', wait: '等待查询',
  source: '余额来源', auto: '自动选择', account: '已登录账户', apiKey: '官方 API Key',
  interval: '自动刷新', off: '关闭', seconds: '秒', low: '余额偏低', stale: '上次数据',
  updated: '更新于', unavailable: '当前不可调用 API', hint: '登录 Harness 账户，或在模型设置中配置官方 DeepSeek API Key。',
  privacy: '直连 DeepSeek；不额外保存密钥。',
  'signed-out': '请先登录 Harness 的 DeepSeek 账户。', unconfigured: '尚未配置账户',
  'invalid-key': 'API Key 无效或已失效，请在模型设置中更新。',
  'rate-limit': '查询太频繁，请稍后刷新。', 'account-failed': '账户余额暂时查询失败，请稍后刷新。',
  'api-failed': 'DeepSeek 接口暂时不可用。', timeout: '查询超时，请稍后刷新。',
  protocol: '余额数据格式发生变化，请更新插件。', network: '连接失败，请检查网络后刷新。',
  'invalid-request': '查询设置无效，请重新选择余额来源。',
  overview: '概览', records: '记录', settings: '设置', peak: '波峰', valley: '波谷', unknownPeriod: '时段待更新',
  changesIn: '下次切换', periodRule: '北京时间：周一至周五 9–12、14–18 为波峰；周末及法定节假日全天波谷。',
  calendarUnknown: '节假日表需更新，暂不推算工作日时段。', todayObserved: '今日已观测', total7: '近 7 天已观测',
  partial: '部分数据', credits: '余额增加', review: '有余额增加待核对',
  observationNote: '按启用后的余额变化记录；离线、充值与赠金到期可能影响结果，不等同官方账单。',
  localEstimate: '本机今日估算', lastTurn: '最近完成的一轮', estimateNote: '按 DeepSeek 官方单价及本机 token 估算，仅记录启用后的 Flash / Pro；不含搜索等按次费用。',
  noRecords: '暂无记录，启用后自动开始记账。', noObservation: '尚无余额观测', date: '日期', export: '导出记录 CSV',
  lowThreshold: '低余额阈值', dailyBudget: '每日预算', budgetHint: '0 表示关闭，按当前币种分别设置。',
  alerts: '显示余额与预算提醒', turnNotices: '每轮结束显示费用提示', showPeriod: '显示波峰 / 波谷', showToday: '账号栏显示今日已观测', fontSize: '账号栏字号',
  budgetReached: '今日已观测消费达到预算', dismiss: '关闭提示', correction: '校正今日已观测消费', applyCorrection: '保存校正',
  correctionHint: '填写本日实际累计消费，后续新观测的下降额继续累加。', saved: '已保存', invalidAmount: '请输入有效的非负金额。',
  storage: '记账文件读取或保存失败，原数据已保留。余额查询仍可使用。', tokens: 'tokens', complete: '已完成', ongoing: '进行中',
};
const en = {
  title: 'DeepSeek Balance', shortTitle: 'Balance', total: 'Available balance', paid: 'Paid', gift: 'Bonus', refresh: 'Refresh balance',
  details: 'Details', close: 'Hide details', loading: 'Checking…', wait: 'Not checked yet',
  source: 'Balance source', auto: 'Automatic', account: 'Signed-in account', apiKey: 'Official API key',
  interval: 'Auto refresh', off: 'Off', seconds: 'seconds', low: 'Low balance', stale: 'Previous data',
  updated: 'Updated', unavailable: 'API calls unavailable', hint: 'Sign in to Harness or configure an official DeepSeek API key in Models.',
  privacy: 'Direct to DeepSeek; no extra key storage.',
  'signed-out': 'Sign in to your DeepSeek account in Harness.', unconfigured: 'No account configured',
  'invalid-key': 'Invalid or expired API key. Update it in Models.', 'rate-limit': 'Too many requests. Try again later.',
  'account-failed': 'Account balance could not be checked. Try again.', 'api-failed': 'DeepSeek API is unavailable.',
  timeout: 'The request timed out. Try again.', protocol: 'The balance response changed. Update this plugin.',
  network: 'Connection failed. Check your network and retry.', 'invalid-request': 'Select a valid balance source.',
  overview: 'Overview', records: 'History', settings: 'Settings', peak: 'Peak', valley: 'Off-peak', unknownPeriod: 'Schedule unknown',
  changesIn: 'Changes in', periodRule: 'Beijing: Mon–Fri 09–12 and 14–18 are peak hours; weekends and Chinese public holidays are off-peak.',
  calendarUnknown: 'Update the holiday calendar to determine weekday pricing.', todayObserved: 'Observed today', total7: 'Observed in 7 days', partial: 'Partial data', credits: 'Balance increases', review: 'Balance increase needs review',
  observationNote: 'Balance changes since activation. Offline gaps, top-ups and expired bonuses affect results; this is not an official bill.',
  localEstimate: 'Local estimate today', lastTurn: 'Last completed turn', estimateNote: 'Official DeepSeek rates × local tokens since activation, Flash/Pro only; excludes per-request tools.',
  noRecords: 'Recording starts after activation.', noObservation: 'No balance observations yet', date: 'Date', export: 'Export CSV',
  lowThreshold: 'Low balance threshold', dailyBudget: 'Daily budget', budgetHint: '0 disables a limit. Configure each currency separately.',
  alerts: 'Balance and budget alerts', turnNotices: 'Completed-turn cost notices', showPeriod: 'Show pricing period', showToday: 'Show observed spend in account row', fontSize: 'Account row font size',
  budgetReached: 'Observed spend reached the daily budget', dismiss: 'Dismiss', correction: 'Correct observed spend today', applyCorrection: 'Save correction',
  correctionHint: 'Enter actual spend to date; future observed drops are added.', saved: 'Saved', invalidAmount: 'Enter a valid nonnegative amount.',
  storage: 'Accounting data could not be read or saved; existing data was preserved. Balance queries still work.', tokens: 'tokens', complete: 'Complete', ongoing: 'Running',
};

const css = `
.dsbc-inline-host{flex:none;min-width:0;font-family:inherit;color:var(--dsw-alias-label-primary,#1b2d45)}
.dsbc-inline-trigger{display:flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:3px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap;font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}
.dsbc-inline-label{font-size:12px;font-weight:500}.dsbc-inline-error{color:var(--dsbc-warn,#ae5422)}.dsbc-inline-trigger:focus-visible{outline:2px solid #487be8;outline-offset:2px}
.dsbc-period-badge{--dsbc-period-fg:#59677d;--dsbc-period-bg:#eef2f7;--dsbc-period-border:#d7dee8;box-sizing:border-box;display:inline-flex;flex:none;align-items:center;gap:5px;height:26px;padding:0 8px;border:1px solid var(--dsbc-period-border);border-radius:999px;background:var(--dsbc-period-bg);color:var(--dsbc-period-fg);line-height:1;white-space:nowrap}
.dsbc-period-peak{--dsbc-period-fg:#b53146;--dsbc-period-bg:#fff0f2;--dsbc-period-border:#efc7cf}.dsbc-period-valley{--dsbc-period-fg:#167049;--dsbc-period-bg:#eaf6ef;--dsbc-period-border:#c7e5d2}
.dsbc-period-icon{width:14px;height:14px;flex:none}.dsbc-period-name{font-size:12px;font-weight:600;letter-spacing:.1px}
.dsbc-inline-label:hover{box-shadow:0 1px 4px #182c4510}.dsbc-period-overview{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px;border:1px solid var(--dsbc-border,#dbe6f0);border-radius:9px;background:var(--dsbc-control,#fff)}.dsbc-period-countdown{display:grid;gap:3px;text-align:right;font-variant-numeric:tabular-nums}.dsbc-period-countdown span{font-size:10px;opacity:.6}.dsbc-period-countdown strong{font-size:12px;font-weight:600}
/* Reserve the money width so the label stays still as the pointer enters and leaves it. */
.dsbc-inline-amount{visibility:hidden;pointer-events:none}.dsbc-inline-trigger:has(.dsbc-inline-label:hover) .dsbc-inline-amount{visibility:visible}
.dsbc-peak{color:#cf3545;opacity:1}.dsbc-valley{color:#188349;opacity:1}.dsbc-inline-today{font-size:10px;opacity:.65}.dsbc-amount-change{animation:dsbc-amount-in .25s ease-out}@keyframes dsbc-amount-in{from{opacity:.45;transform:translateY(2px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.dsbc-amount-change{animation:none}}
/* The two documented sidebar seats are siblings. Grid places the balance beside the account without replacing its menu. */
div:has(> div > [data-slot="sidebar.footer.action"]):has(.dsbc-inline-host[data-wide="true"]){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:4px;padding-right:8px}
div:has(> [data-slot="sidebar.footer.action"]):has(.dsbc-inline-host[data-wide="true"]){grid-area:1/2;width:auto;align-self:center}
div:has(> [data-slot="sidebar.footer.action"]):has(.dsbc-inline-host[data-wide="true"]) + div{grid-area:1/1;min-width:0}
.dsbc-inline-host[data-wide="false"]{margin:3px 0}.dsbc-inline-host[data-wide="false"] .dsbc-inline-trigger{padding:4px 2px;font-size:10px;max-width:54px}
.dsbc-inline-host[data-wide="false"] .dsbc-period-badge{height:24px;padding:0 5px;gap:3px}.dsbc-inline-host[data-wide="false"] .dsbc-period-icon{width:12px;height:12px}.dsbc-inline-host[data-wide="false"] .dsbc-inline-trigger{position:relative}.dsbc-inline-host[data-wide="false"] .dsbc-inline-amount{position:absolute;left:calc(100% + 4px);z-index:1200;padding:5px 7px;border:1px solid var(--dsw-alias-divider,#dbe6f0);border-radius:6px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#1b2d45);box-shadow:0 2px 8px #0001}
.dsbc{box-sizing:border-box;width:260px;max-width:calc(100vw - 24px);min-width:0;margin:0;padding:12px 13px 10px;border:1px solid var(--dsbc-border,#dbe6f0);border-radius:12px;background:var(--dsbc-bg,#f4f8fd);color:var(--dsbc-text,#1b2d45);font-family:inherit;font-size:12px;line-height:1.5;text-align:left}
.dsbc-popover{position:fixed;z-index:1200;max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 8px 28px #0002;visibility:hidden}.dsbc-popover[data-positioned="true"]{visibility:visible}
.dsbc-tabs{display:flex;gap:4px;margin:9px 0;border-bottom:1px solid var(--dsbc-border,#dbe6f0);padding-bottom:6px}.dsbc-tab{flex:1;border:0;border-radius:5px;padding:5px;background:transparent;color:inherit;font-size:11px}.dsbc-tab[aria-selected="true"]{background:#739ee525;font-weight:600}.dsbc-section{display:grid;gap:8px}.dsbc-stat{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-variant-numeric:tabular-nums}.dsbc-stat strong{font-size:13px;font-weight:600}.dsbc-caption{font-size:10px;line-height:1.6;opacity:.65;margin:0}.dsbc-warning{background:#e6993020;border-radius:6px;padding:7px 8px;font-size:11px;color:var(--dsbc-warn,#ae5422)}.dsbc-check{display:flex;align-items:center;gap:6px;font-size:11px}.dsbc input[type=number],.dsbc input[type=text]{width:100%;min-width:0;background:var(--dsbc-control,#fff);color:inherit;border:1px solid var(--dsbc-border,#dbe6f0);border-radius:5px;padding:5px;font:inherit;font-size:11px}.dsbc-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dsbc-table{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}.dsbc-table td,.dsbc-table th{text-align:right;padding:5px 3px;border-bottom:1px solid var(--dsbc-border,#dbe6f0)}.dsbc-table td:first-child,.dsbc-table th:first-child{text-align:left}.dsbc-record{padding:7px 0;border-bottom:1px solid var(--dsbc-border,#dbe6f0);font-size:11px}.dsbc-action{border:1px solid var(--dsbc-border,#dbe6f0);border-radius:5px;background:var(--dsbc-control,#fff);color:inherit;padding:5px 8px;font-size:11px}.dsbc-toast{position:fixed;bottom:70px;left:16px;z-index:1500;width:260px;border-radius:10px;padding:11px 12px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#1b2d45);border:1px solid #e6993055;box-shadow:0 4px 20px #0002;font:12px/1.5 system-ui}.dsbc-toast button{float:right;border:0;background:transparent;color:inherit;font-size:16px;cursor:pointer}.dsbc-toast p{margin:0 18px 0 0}
.dsbc *{box-sizing:border-box}.dsbc button,.dsbc select{font:inherit}.dsbc button{cursor:pointer}.dsbc button:focus-visible,.dsbc select:focus-visible{outline:2px solid #487be8;outline-offset:3px}
.dsbc-head,.dsbc-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.dsbc-head{font-weight:600}.dsbc-brand{display:flex;align-items:center;gap:7px}.dsbc-dot{height:7px;width:7px;border-radius:50%;background:#4e80e9;flex:none}.dsbc-refresh{display:grid;place-items:center;border:0;background:transparent;color:inherit;width:25px;height:25px;border-radius:6px;padding:4px}.dsbc-refresh:hover{background:#739ee520}.dsbc-refresh:disabled{cursor:wait;opacity:.45}
.dsbc-wallet{margin-top:7px}.dsbc-amount{font-size:20px;line-height:1.25;letter-spacing:-.3px;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.dsbc-currency{font-size:10px;letter-spacing:0;font-weight:500;opacity:.6;margin-left:5px}.dsbc-muted{opacity:.65;font-size:11px}.dsbc-breakdown{margin-top:3px;font-variant-numeric:tabular-nums;display:flex;gap:9px;flex-wrap:wrap}.dsbc-foot{display:flex;justify-content:space-between;align-items:center;margin-top:9px;gap:8px;font-size:10px}.dsbc-link{padding:0;border:0;background:transparent;color:inherit;opacity:.75;font-size:10px;white-space:nowrap}.dsbc-link:hover{opacity:1;text-decoration:underline}
.dsbc-notice{font-size:11px;margin:8px 0 0;overflow-wrap:anywhere}.dsbc-error{color:var(--dsbc-warn,#ae5422)}.dsbc-low{font-size:10px;display:inline-block;color:var(--dsbc-warn,#ae5422);margin-top:3px}.dsbc-details{border-top:1px solid var(--dsbc-border,#dbe6f0);margin-top:10px;padding-top:10px;display:grid;gap:9px}.dsbc-label{display:grid;gap:4px}.dsbc select{width:100%;border:1px solid var(--dsbc-border,#dbe6f0);border-radius:6px;background:var(--dsbc-control,#fff);color:inherit;padding:5px 7px}.dsbc-compact{margin:4px;padding:5px;min-width:40px;width:auto;font-size:10px;text-align:center}.dsbc-compact .dsbc-amount{font-size:11px;letter-spacing:0}.dsbc-compact button{border:0;background:transparent;color:inherit;padding:3px;max-width:100%;overflow-wrap:anywhere}
body[data-ds-dark-theme] .dsbc{--dsbc-bg:#202b3c;--dsbc-text:#dfe8f8;--dsbc-border:#35445d;--dsbc-control:#1a2434;--dsbc-warn:#f1b57e}
body[data-ds-dark-theme] .dsbc-peak{color:#ff818c}body[data-ds-dark-theme] .dsbc-valley{color:#6bcc91}
body[data-ds-dark-theme] .dsbc-period-badge{--dsbc-period-fg:#b8c6da;--dsbc-period-bg:#2a3446;--dsbc-period-border:#445269}body[data-ds-dark-theme] .dsbc-period-peak{--dsbc-period-fg:#ff9cac;--dsbc-period-bg:#422b37;--dsbc-period-border:#704152}body[data-ds-dark-theme] .dsbc-period-valley{--dsbc-period-fg:#86dca8;--dsbc-period-bg:#203c34;--dsbc-period-border:#365f4e}
@media(prefers-color-scheme:dark){html:not([data-theme=light]) .dsbc.dsbc-preview-dark{--dsbc-bg:#202b3c;--dsbc-text:#dfe8f8;--dsbc-border:#35445d;--dsbc-control:#1a2434;--dsbc-warn:#f1b57e}}
`;

function PeriodBadge({ kind, label, inline = false }) {
  const path = kind === 'peak' ? 'M1 10h3l3-6 3 6h3' : kind === 'valley' ? 'M1 4h3l3 6 3-6h3' : 'M7 3v5m0 3h.01';
  return h('span', { className: `dsbc-period-badge dsbc-period-${kind}${inline ? ' dsbc-inline-label' : ''}` },
    h('svg', { className: 'dsbc-period-icon', viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: path })),
    h('span', { className: 'dsbc-period-name' }, label),
  );
}

function preferences() {
  let value;
  try { value = JSON.parse(localStorage.getItem(STORAGE) || '{}'); }
  catch (error) { value = {}; /* Preferences can be reset if local browser storage is unavailable. */ }
  return {
    source: ['auto', 'account', 'api-key'].includes(value?.source) ? value.source : 'auto',
    interval: [0, 30, 60, 300].includes(value?.interval) ? value.interval : 60,
    fontSize: [10,11,12,13].includes(value?.fontSize) ? value.fontSize : 12,
    showPeriod: value?.showPeriod !== false, showToday: value?.showToday === true,
    alerts: value?.alerts !== false, turnNotices: value?.turnNotices === true,
    lowCny: validAmount(value?.lowCny, '5'), lowUsd: validAmount(value?.lowUsd, '1'),
    budgetCny: validAmount(value?.budgetCny, '0'), budgetUsd: validAmount(value?.budgetUsd, '0'),
  };
}

function validAmount(value, fallback) {
  return typeof value === 'string' && /^\d{1,12}(?:\.\d{1,8})?$/.test(value) ? value : fallback;
}
function atLeast(amount, limit) {
  const diff = sumMoney([amount, limit.startsWith('-') ? limit.slice(1) : '-' + limit]);
  return !diff.startsWith('-');
}
function alertMessages(data, prefs, t) {
  if (!data || !prefs.alerts) return [];
  const result = [];
  for (const balance of data.balances) {
    const suffix = balance.currency === 'CNY' ? 'Cny' : 'Usd';
    const limit = prefs['low'+suffix];
    const budget = prefs['budget'+suffix];
    const observed = data.accounting?.currencies.find(row=>row.currency === balance.currency)?.today;
    if (decimal(limit).units > 0n && atLeast(limit,balance.total)) result.push({ id:`low:${balance.currency}:${limit}`, text:`${t('low')} · ${formatMoney(balance.total,balance.currency)}` });
    if (observed && decimal(budget).units > 0n && atLeast(observed.spent,budget)) result.push({ id:`budget:${balance.currency}:${budget}`, text:`${t('budgetReached')} · ${formatMoney(observed.spent,balance.currency)}` });
  }
  return result;
}

function install(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'balance-card: dictionaries');
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-balance-card-local';
    style.textContent = css;
    document.head.append(style);
    return () => style.remove();
  }, 'balance-card: style');

  let current = { data: null, error: null, busy: false, prefs: preferences() };
  const listeners = new Set();
  const store = { getSnapshot: () => current, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
  const publish = change => { current = { ...current, ...change }; for (const listener of listeners) listener(); };
  let disposed = false;
  let active;
  let timer;
  let lastAttempt = 0;
  const schedule = () => {
    clearTimeout(timer);
    if (!disposed && current.prefs.interval > 0) timer = setTimeout(() => { void refresh(); }, current.prefs.interval * 1000);
  };
  async function refresh() {
    if (disposed || active) return;
    const request = new AbortController();
    active = request;
    lastAttempt = Date.now();
    publish({ busy: true });
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const locale = ctx.locale.getSnapshot().active.startsWith('en') ? 'en' : 'zh';
      const result = await ctx.connection.rpc.call('/api', 'local-balance/read', {
        source: current.prefs.source, locale, timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      }, request.signal);
      if (disposed || active !== request) return;
      if (!result.ok) throw new Error('network');
      const value = result.value;
      if (value?.status === 'ready') {
        // Validate money fields before exposing provider data to the view.
        if (!['account', 'api-key'].includes(value.source) || !Array.isArray(value.balances) || value.balances.length === 0 || !Number.isFinite(value.updatedAt)) throw new Error('protocol');
        for (const balance of value.balances) {
          if (!['CNY', 'USD'].includes(balance.currency)) throw new Error('protocol');
          for (const field of ['total', 'granted', 'toppedUp']) decimal(balance[field]);
        }
        publish({ data: value, error: null });
      } else if (value?.status === 'empty') publish({ data: null, error: value.code });
      else if (value?.status === 'error') {
        publish({ error: value.code, ...(['invalid-key'].includes(value.code) ? { data: null } : {}) });
      } else throw new Error('protocol');
    } catch (error) {
      if (!disposed && active === request) publish({ error: request.signal.aborted ? 'timeout' : error.message === 'protocol' ? 'protocol' : 'network' });
    } finally {
      clearTimeout(timeout);
      if (active === request) { active = undefined; if (!disposed) publish({ busy: false }); schedule(); }
    }
  }
  const invalidate = () => {
    const previous = active;
    active = undefined;
    previous?.abort();
    publish({ data: null, error: null, busy: false });
    void refresh();
  };
  const updatePreferences = change => {
    const next = { ...current.prefs, ...change };
    try { localStorage.setItem(STORAGE, JSON.stringify(next)); }
    catch (error) { /* Use in-memory preferences for this window when persistence is disabled. */ }
    const sourceChanged = next.source !== current.prefs.source;
    publish({ prefs: next });
    if (sourceChanged) invalidate();
    else schedule();
  };
  const onFocus = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastAttempt >= 10000) void refresh();
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onFocus);
  const summaryTimer = setInterval(async () => {
    if (document.visibilityState !== 'visible' || !current.data) return;
    const previous = current.data;
    try {
      const result = await ctx.connection.rpc.call('/api','local-balance/summary',{ bookId: previous.accounting?.bookId ?? null });
      if (!disposed && current.data === previous && result.ok && result.value?.status === 'ready') publish({data:{...previous,accounting:result.value.accounting,storageError:result.value.storageError}});
    } catch (error) { /* Balance polling owns connection errors; local usage is retried on the next tick. */ }
  },10000);
  ctx.on('connection/reset', invalidate);
  ctx.effect(() => () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(summaryTimer);
    active?.abort();
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onFocus);
    listeners.clear();
  }, 'balance-card: polling lifetime');

  // The account stream clears data immediately when the user signs out or changes accounts.
  if (ctx.remote.account && typeof ctx.remote.$stream === 'function') {
    const stream = ctx.remote.$stream({ name: 'balance-card-account', open: signal => ctx.remote.account.watch(signal), ended: () => new Error('account stream ended') });
    ctx.effect(() => () => stream.dispose(), 'balance-card: account changes');
    void (async () => {
      try {
        for await (const frame of stream) {
          frame.accept();
          if (!disposed && current.prefs.source !== 'api-key') invalidate();
        }
      } catch (error) { if (!disposed) publish({ data: null, error: 'network' }); }
    })();
  }

  function Card({ wide, t }) {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const [expanded, setExpanded] = useState(false);
    const [tab, setTab] = useState('overview');
    const [clock, setClock] = useState(Date.now());
    const [notice, setNotice] = useState(null);
    const [correctionAmount, setCorrectionAmount] = useState('');
    const [correctionCurrency, setCorrectionCurrency] = useState('CNY');
    const [correctionStatus, setCorrectionStatus] = useState('');
    const [correcting, setCorrecting] = useState(false);
    const lastTurnSeen = useRef(null);
    const alertedRef = useRef(null);
    const anchor = useRef(null);
    const panel = useRef(null);
    const popupId = React.useId();
    const { data, error, busy, prefs } = snapshot;
    const message = error ? (Object.hasOwn(zh, error) ? t(error) : t('network')) : null;
    const source = data?.source === 'account' ? t('account') : t('apiKey');
    const updated = data ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const accounting = data?.accounting;
    const period = periodInfo(clock);
    const periodLabel = t(period.kind === 'unknown' ? 'unknownPeriod' : period.kind);
    const warnings = alertMessages(data,prefs,t);
    useEffect(() => { const tick = setInterval(()=>setClock(Date.now()),30000); return ()=>clearInterval(tick); }, []);
    useEffect(() => {
      if (!data) { setNotice(null); return; }
      if (alertedRef.current === null) {
        try { const saved = JSON.parse(localStorage.getItem(STORAGE+'.alerts') || '[]'); alertedRef.current = Array.isArray(saved) ? saved : []; }
        catch(error) { alertedRef.current = []; }
      }
      const alerted = alertedRef.current;
      for (const warning of alertMessages(data,prefs,t)) {
        const id = `${accounting?.bookId}:${beijingDay()}:${warning.id}`;
        if (!alerted.includes(id)) { alerted.push(id); setNotice(warning.text); }
      }
      try { localStorage.setItem(STORAGE+'.alerts',JSON.stringify(alerted.slice(-128))); }
      catch(error) { /* In-memory notices remain available without persistent preference storage. */ }
      const last = accounting?.lastTurn;
      if (last && lastTurnSeen.current !== null && last.noticeSeq > lastTurnSeen.current && prefs.turnNotices) setNotice(`${t('lastTurn')} · ≈${formatMoney(last.cost,'CNY')} · ${last.tokens.toLocaleString()} ${t('tokens')}`);
      if (last) lastTurnSeen.current = last.noticeSeq;
    }, [data,prefs,t]);
    useEffect(() => { if (!notice) return; const timer = setTimeout(()=>setNotice(null),8000); return ()=>clearTimeout(timer); }, [notice]);
    const correct = async () => {
      if (validAmount(correctionAmount,null) === null || !accounting?.bookId) { setCorrectionStatus('invalidAmount'); return; }
      setCorrecting(true);
      try {
        const currency = data.balances.some(row=>row.currency === correctionCurrency) ? correctionCurrency : data.balances[0].currency;
        const result = await ctx.connection.rpc.call('/api','local-balance/reconcile',{bookId:accounting.bookId,currency,day:accounting.day,amount:correctionAmount});
        if (!result.ok || result.value?.status !== 'ready') throw new Error('storage');
        if (current.data?.accounting?.bookId === accounting.bookId) publish({data:{...current.data,accounting:result.value.accounting}});
        setCorrectionStatus('saved');
      } catch(error) { setCorrectionStatus('storage'); }
      finally { setCorrecting(false); }
    };
    const download = () => {
      if (!accounting) return;
      const rows = [['type','time_beijing','currency','amount','tokens','session','turn','model']];
      for (const wallet of accounting.currencies) for (const row of wallet.history) if (!row.missing) {
        rows.push(['observed-spend',row.date,wallet.currency,row.spent,'','','','']);
        rows.push(['balance-increase',row.date,wallet.currency,row.credits,'','','','']);
      }
      for (const row of accounting.turns) rows.push(['estimated-turn',new Date(row.at+28800000).toISOString().slice(0,19).replace('T',' '),'CNY',row.cost,row.tokens,row.sessionId,row.turn,row.models.join(' / ')]);
      const csv = '\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      const link = document.createElement('a'); link.href=url; link.download=`DeepSeek-${accounting.day}.csv`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const check = key => h('label',{className:'dsbc-check',key},h('input',{type:'checkbox',checked:prefs[key],onChange:event=>updatePreferences({[key]:event.target.checked})}),t(key));
    const moneyInput = (key,label) => h('label',{className:'dsbc-label',key},label,h('input',{type:'number',min:'0',step:'0.01',defaultValue:prefs[key],key:key+prefs[key],onBlur:event=>{
      const value = validAmount(event.target.value,null);
      if (value === null) event.target.value=prefs[key]; else updatePreferences({[key]:value});
    }}));
    useLayoutEffect(() => {
      if (!expanded) return;
      const position = () => {
        if (!anchor.current || !panel.current) return;
        const rect = anchor.current.getBoundingClientRect();
        const popup = panel.current;
        popup.style.maxHeight = `${Math.max(120,rect.top-20)}px`;
        const left = Math.max(12, Math.min(rect.right - popup.offsetWidth, window.innerWidth - popup.offsetWidth - 12));
        const top = Math.max(12, rect.top - popup.offsetHeight - 8);
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.dataset.positioned = 'true';
      };
      position();
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);
      const observer = new ResizeObserver(position);
      observer.observe(panel.current);
      return () => { observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
    }, [expanded]);
    useEffect(() => {
      if (!expanded) return;
      const outside = event => {
        if (!anchor.current?.contains(event.target) && !panel.current?.contains(event.target)) setExpanded(false);
      };
      const escape = event => {
        if (event.key === 'Escape') { event.stopPropagation(); setExpanded(false); anchor.current?.focus(); }
      };
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', escape, true);
      return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); };
    }, [expanded]);
    const amount = data ? data.balances.map(balance => formatMoney(balance.total, balance.currency)).join(' / ') : busy ? '…' : '—';
    const popup = expanded && h('section', { ref: panel, id: popupId, role: 'dialog', className: 'dsbc dsbc-popover', 'aria-label': t('title'), 'aria-busy': busy },
      h('div', { className: 'dsbc-head' },
        h('span', { className: 'dsbc-brand' }, h('i', { className: 'dsbc-dot', 'aria-hidden': true }), t('title')),
        h('button', { type: 'button', className: 'dsbc-refresh', onClick: refresh, disabled: busy, title: t('refresh'), 'aria-label': t('refresh') },
          h('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true },
            h('path', { d: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17' })))),
      h('div',{className:'dsbc-tabs',role:'tablist'},...['overview','records','settings'].map(key=>h('button',{key,type:'button',role:'tab','aria-selected':tab===key,className:'dsbc-tab',onClick:()=>setTab(key)},t(key)))),
      tab === 'overview' && h('div',{className:'dsbc-section'},
      h('div',{className:'dsbc-period-overview'},h(PeriodBadge,{kind:period.kind,label:periodLabel}),h('div',{className:'dsbc-period-countdown'},h('span',null,t('changesIn')),h('strong',null,countdown(period.nextAt,clock)))),
      h('p',{className:'dsbc-caption'},period.calendarKnown ? t('periodRule') : t('calendarUnknown')),
      data ? data.balances.map(balance => h('div', { className: 'dsbc-wallet', key: balance.currency },
        h('div', { className: 'dsbc-amount', 'aria-label': `${t('total')} ${balance.currency}` }, formatMoney(balance.total, balance.currency), h('span', { className: 'dsbc-currency' }, balance.currency)),
        h('div', { className: 'dsbc-muted dsbc-breakdown' }, h('span', null, `${t('paid')} ${formatMoney(balance.toppedUp, balance.currency)}`), h('span', null, `${t('gift')} ${formatMoney(balance.granted, balance.currency)}`)),
      )) : h('p', { className: 'dsbc-notice dsbc-muted' }, busy ? t('loading') : message || t('wait')),
      data && message && h('p', { className: 'dsbc-notice dsbc-error', role: 'status' }, `${message} · ${t('stale')}`),
      !data && !busy && ['unconfigured', 'signed-out'].includes(error) && h('p', { className: 'dsbc-notice dsbc-muted' }, t('hint')),
      data?.available === false && h('p', { className: 'dsbc-notice dsbc-error' }, t('unavailable')),
      ...warnings.map(warning=>h('div',{key:warning.id,className:'dsbc-warning'},warning.text)),
      ...(accounting?.currencies ?? []).map(wallet=>h('div',{key:wallet.currency,className:'dsbc-section'},
        h('div',{className:'dsbc-stat'},h('span',null,t('todayObserved')),h('strong',null,formatMoney(wallet.today.spent,wallet.currency))),
        h('div',{className:'dsbc-stat dsbc-muted'},h('span',null,t('total7')),h('span',null,formatMoney(wallet.total7,wallet.currency))),
        h('p',{className:'dsbc-caption'},wallet.today.review ? t('review') : t('partial')),
      )),
      accounting && h('div',{className:'dsbc-stat'},h('span',null,t('localEstimate')),h('strong',null,'≈'+formatMoney(accounting.totalEstimatedToday,'CNY'))),
      accounting?.lastTurn && h('div',{className:'dsbc-caption'},`${t('lastTurn')} · ≈${formatMoney(accounting.lastTurn.cost,'CNY')} · ${accounting.lastTurn.tokens.toLocaleString()} ${t('tokens')}`),
      h('p',{className:'dsbc-caption'},t('observationNote')),
      h('p',{className:'dsbc-caption'},t('estimateNote')),
      ),
      tab === 'records' && h('div',{className:'dsbc-section'},
        ...(accounting?.currencies ?? []).map(wallet=>h('div',{key:wallet.currency},h('div',{className:'dsbc-head'},wallet.currency),
          h('table',{className:'dsbc-table'},
            h('thead',null,h('tr',null,h('th',null,t('date')),h('th',null,t('todayObserved')),h('th',null,t('credits')))),
            h('tbody',null,...wallet.history.map(row=>h('tr',{key:row.date,title:row.partial?t('partial'):''},
              h('td',null,row.date.slice(5)),
              h('td',null,row.missing?'—':formatMoney(row.spent,wallet.currency)),
              h('td',null,row.missing?'—':formatMoney(row.credits,wallet.currency)),
            ))),
          ),
        )),
        !(accounting?.currencies.length) && h('p',{className:'dsbc-caption'},t('noObservation')),
        ...(accounting?.turns ?? []).slice(0,10).map(row=>h('div',{key:row.seq,className:'dsbc-record'},
          h('div',{className:'dsbc-stat'},h('span',null,new Date(row.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),h('strong',{title:row.cost},'≈'+formatMoney(row.cost,'CNY'))),
          h('div',{className:'dsbc-caption'},`${row.models.join(' / ')} · #${row.turn} · ${row.tokens.toLocaleString()} ${t('tokens')} · ${t(row.complete?'complete':'ongoing')}`),
        )),
        !(accounting?.turns.length) && h('p',{className:'dsbc-caption'},t('noRecords')),
        h('button',{type:'button',className:'dsbc-action',disabled:!accounting,onClick:download},t('export')),
        h('p',{className:'dsbc-caption'},t('estimateNote')),
      ),
      tab === 'settings' && h('div',{className:'dsbc-section'},
        data && h('div', { className: 'dsbc-muted' }, source),
        h('label', { className: 'dsbc-label' }, t('source'), h('select', { value: prefs.source, onChange: e => updatePreferences({ source: e.target.value }) },
          ...[['auto', 'auto'], ['account', 'account'], ['api-key', 'apiKey']].map(([value, label]) => h('option', { key: value, value }, t(label))))),
        h('label', { className: 'dsbc-label' }, t('interval'), h('select', { value: prefs.interval, onChange: e => updatePreferences({ interval: Number(e.target.value) }) },
          ...[30, 60, 300, 0].map(value => h('option', { key: value, value }, value === 0 ? t('off') : `${value} ${t('seconds')}`)))),
        h('label',{className:'dsbc-label'},t('fontSize'),h('select',{value:prefs.fontSize,onChange:e=>updatePreferences({fontSize:Number(e.target.value)})},...[10,11,12,13].map(size=>h('option',{value:size,key:size},size+'px')))),
        ...['showPeriod','showToday','alerts','turnNotices'].map(check),
        h('div',{className:'dsbc-inputs'},moneyInput('lowCny',t('lowThreshold')+' CNY'),moneyInput('lowUsd',t('lowThreshold')+' USD')),
        h('div',{className:'dsbc-inputs'},moneyInput('budgetCny',t('dailyBudget')+' CNY'),moneyInput('budgetUsd',t('dailyBudget')+' USD')),
        h('p',{className:'dsbc-caption'},t('budgetHint')),
        accounting?.bookId && h('div',{className:'dsbc-details'},h('label',{className:'dsbc-label'},t('correction'),h('input',{type:'number',min:0,step:'0.01',value:correctionAmount,onChange:e=>setCorrectionAmount(e.target.value)})),
          h('select',{'aria-label':'Currency',value:data.balances.some(row=>row.currency===correctionCurrency)?correctionCurrency:data.balances[0].currency,onChange:e=>setCorrectionCurrency(e.target.value)},...data.balances.map(row=>h('option',{key:row.currency,value:row.currency},row.currency))),
          h('button',{type:'button',className:'dsbc-action',onClick:correct,disabled:correcting},t('applyCorrection')),
          correctionStatus && h('p',{className:'dsbc-caption',role:'status'},t(correctionStatus)),h('p',{className:'dsbc-caption'},t('correctionHint')),
        ),
        h('div', { className: 'dsbc-muted' }, t('privacy')),
      ),
      data?.storageError && h('p',{className:'dsbc-warning'},t('storage')),
      h('div', { className: 'dsbc-foot' }, h('span', { className: 'dsbc-muted' }, busy ? t('loading') : data ? `${t('updated')} ${updated}` : 'DeepSeek'),
        h('button', { type: 'button', className: 'dsbc-link', onClick: () => { setExpanded(false); anchor.current?.focus(); } }, t('close'))),
    );
    return h('div', { className: 'dsbc-inline-host', 'data-wide': String(wide) },
      h('button', { ref: anchor, type: 'button', className: `dsbc-inline-trigger${error ? ' dsbc-inline-error' : ''}`,
        style:wide?{fontSize:prefs.fontSize+'px'}:undefined,
        onClick: () => setExpanded(!expanded), 'aria-haspopup': 'dialog', 'aria-expanded': expanded, 'aria-controls': expanded ? popupId : undefined,
        'aria-label': `${t('title')} ${amount}${prefs.showPeriod?' · '+periodLabel:''}`, title: message || `${periodLabel} · ${t('changesIn')} ${countdown(period.nextAt,clock)}`,
      }, prefs.showPeriod ? h(PeriodBadge,{kind:period.kind,label:periodLabel,inline:true}) : h('span', { className: 'dsbc-inline-label dsbc-period-badge' }, t('shortTitle')),
      h('span',{key:amount,className:'dsbc-inline-amount dsbc-amount-change'},amount),
      wide && prefs.showToday && accounting?.currencies[0] && h('span',{className:'dsbc-inline-amount dsbc-inline-today'},'· '+formatMoney(accounting.currencies[0].today.spent,accounting.currencies[0].currency)),
      (error || warnings.length > 0) && h('span', { className:'dsbc-inline-error','aria-hidden': true }, '!')),
      popup && createPortal(popup, document.body),
      notice && createPortal(h('div',{className:'dsbc-toast',role:'status'},h('button',{type:'button','aria-label':t('dismiss'),onClick:()=>setNotice(null)},'×'),h('p',null,notice)),document.body),
    );
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'local-deepseek-balance-card', order: -100, locale: NS }, Card));
  void refresh();
}

function apply(ctx) {
  try { install(ctx); }
  catch (error) {
    console.error('[balance-card] startup failed', error);
    throw error;
  }
}
