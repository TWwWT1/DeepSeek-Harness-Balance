import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newLedger, observe, reconcile, summary, recordEvent, finishTurn } from '../lib/accounting.js';
import { pricingPeriod, periodInfo, estimateUsage } from '../lib/pricing.js';
import { LedgerStore } from '../lib/store.js';

const time = value => Date.parse(value+'+08:00');
const wallet = (total,currency='CNY') => [{currency,total,granted:'0',toppedUp:total}];

test('pricing switches exactly at Beijing boundaries, including weekends and public holidays', () => {
  for (const [at,kind] of [
    ['2026-10-19T08:59:59','valley'],['2026-10-19T09:00:00','peak'],['2026-10-19T12:00:00','valley'],
    ['2026-10-19T14:00:00','peak'],['2026-10-19T18:00:00','valley'],['2026-10-18T10:00:00','valley'],
    ['2026-10-10T10:00:00','valley'],['2026-10-01T10:00:00','valley'],['2027-01-04T10:00:00','unknown'],
  ]) assert.equal(pricingPeriod(time(at)).kind,kind,at);
  assert.equal(periodInfo(time('2026-10-18T20:00:00')).nextAt,time('2026-10-19T09:00:00'));
  assert.equal(periodInfo(time('2026-09-30T18:00:00')).nextAt,time('2026-10-08T09:00:00'));
});

test('usage estimates include cache writes and never add reasoning a second time', () => {
  const usage = {inputTokens:1000000,cacheReadTokens:1000000,cacheWriteTokens:1000000,outputTokens:1000000,reasoningTokens:900000};
  const valley = estimateUsage('deepseek-flash',usage,time('2026-10-18T10:00:00'));
  const peak = estimateUsage('deepseek-flash',usage,time('2026-10-19T10:00:00'));
  assert.equal(valley.cost,'6.02000000');
  assert.equal(peak.cost,'12.04000000');
  assert.equal(valley.tokens,4000000);
  assert.equal(estimateUsage('other-model',usage,time('2026-10-18T10:00:00')),null);
  assert.equal(estimateUsage('deepseek-flash',{inputTokens:-1,outputTokens:1},time('2026-10-18T10:00:00')),null);
});

test('top-ups do not cancel observed consumption, and are flagged for reconciliation', () => {
  const ledger = newLedger(); const start=time('2026-10-18T09:00:00');
  observe(ledger,'account:A','account',wallet('100'),start);
  observe(ledger,'account:A','account',wallet('99.90'),start+60000);
  observe(ledger,'account:A','account',wallet('149.90'),start+120000);
  observe(ledger,'account:A','account',wallet('149.70'),start+180000);
  const result=summary(ledger,'account:A',start+180000).currencies[0];
  assert.equal(result.today.spent,'0.30000000');
  assert.equal(result.today.credits,'50.00000000');
  assert.equal(result.today.review,true);
  reconcile(ledger,'account:A','CNY','2026-10-18','0.4');
  observe(ledger,'account:A','account',wallet('149.60'),start+240000);
  assert.equal(summary(ledger,'account:A',start+240000).currencies[0].today.spent,'0.50000000');
});

test('account changes, currencies, delayed observations and midnight never share a baseline', () => {
  const ledger=newLedger(); const start=time('2026-10-18T23:59:00');
  observe(ledger,'key:A','api-key',wallet('100'),start);
  observe(ledger,'key:B','api-key',wallet('2'),start+1000);
  observe(ledger,'key:A','api-key',wallet('99'),start+2000);
  observe(ledger,'key:A','api-key',wallet('101'),start-1000);
  observe(ledger,'key:A','api-key',wallet('3','USD'),start+3000);
  assert.equal(summary(ledger,'key:A',start+4000).currencies[0].today.spent,'1.00000000');
  assert.equal(summary(ledger,'key:B',start+4000).currencies[0].today.spent,'0.00000000');
  observe(ledger,'key:A','api-key',wallet('98'),time('2026-10-19T00:01:00'));
  const result=summary(ledger,'key:A',time('2026-10-19T00:01:00')).currencies[0];
  assert.equal(result.today.spent,'0.00000000');
  assert.equal(result.total7,'1.00000000');
  assert.equal(result.today.partial,true);
});

test('per-session turns deduplicate sequence ids and survive an unfinished turn', () => {
  const ledger=newLedger();
  const event={type:'assistant/message',seq:1,time:time('2026-10-18T10:00:00'),data:{turn:1,message:{source:{model:'deepseek-flash',provider:'deepseek-account'}},usage:{inputTokens:1000000,outputTokens:0}}};
  assert.equal(recordEvent(ledger,'A',event),true);
  assert.equal(recordEvent(ledger,'A',event),false);
  recordEvent(ledger,'B',event);
  finishTurn(ledger,'B',{type:'turn/end',data:{turn:1}});
  const result=summary(ledger,null,event.time);
  assert.equal(result.totalEstimatedToday,'2.00000000');
  assert.equal(result.turns.length,2);
  assert.equal(result.lastTurn.sessionId,'B');
  assert.equal(result.turns.find(row=>row.sessionId==='A').complete,false);
  finishTurn(ledger,'A',{type:'turn/end',time:event.time+10000,data:{turn:1}});
  const next=summary(ledger,null,event.time+10000);
  assert.equal(next.lastTurn.sessionId,'A');
  assert.ok(next.lastTurn.noticeSeq > result.lastTurn.noticeSeq);
  assert.equal(recordEvent(ledger,'C',{...event,data:{...event.data,message:{source:{model:'deepseek-flash',provider:'proxy'}}}}),false);
});

test('atomic storage serializes separate writers and preserves unreadable data', async () => {
  const folder=await mkdtemp(join(tmpdir(),'balance-test-'));const file=join(folder,'ledger.json');
  try {
    const one=new LedgerStore(file), two=new LedgerStore(file);
    await Promise.all(Array.from({length:8},(_,i)=>(i%2?one:two).transact(ledger=>{ledger.seq++;})));
    assert.equal(JSON.parse(await readFile(file,'utf8')).seq,8);
    await writeFile(file,'corrupt original data');
    await assert.rejects(one.transact(ledger=>{ledger.seq++;}),/storage/);
    assert.equal(await readFile(file,'utf8'),'corrupt original data');
  } finally { await rm(folder,{recursive:true,force:true}); }
});

test('a turn spanning midnight attributes each request cost to its actual Beijing date', () => {
  const ledger=newLedger();
  const event={type:'assistant/message',seq:1,time:time('2026-10-18T23:59:00'),data:{turn:1,message:{source:{model:'deepseek-flash',provider:'deepseek-official'}},usage:{inputTokens:1000000,outputTokens:0}}};
  recordEvent(ledger,'A',event);
  recordEvent(ledger,'A',{...event,seq:2,time:time('2026-10-19T00:01:00')});
  assert.equal(summary(ledger,null,event.time).totalEstimatedToday,'1.00000000');
  assert.equal(summary(ledger,null,time('2026-10-19T00:01:00')).totalEstimatedToday,'1.00000000');
  assert.equal(ledger.turns[0].cost,'2.00000000');
});
