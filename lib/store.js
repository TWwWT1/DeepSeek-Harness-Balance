import { readFile, writeFile, rename, mkdir, open, unlink, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { newLedger } from './accounting.js';

/** Serializes local writers and atomically replaces data; unreadable data is never overwritten. */
export class LedgerStore {
  constructor(path) { this.path = path; this.pending = Promise.resolve(); }
  transact(change, { write = true } = {}) {
    const operation = this.pending.catch(() => {}).then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const lockPath = this.path + '.lock';
      let lock;
      for (let attempt=0; attempt<60; attempt++) {
        try { lock = await open(lockPath,'wx'); break; }
        catch(error) {
          if (error.code !== 'EEXIST') throw error;
          const info = await stat(lockPath).catch(() => null);
          if (info && Date.now()-info.mtimeMs > 30000) await unlink(lockPath).catch(() => {});
          await new Promise(resolve=>setTimeout(resolve,50));
        }
      }
      if (!lock) throw new Error('storage');
      let temp;
      try {
        let ledger;
        try { ledger = JSON.parse(await readFile(this.path,'utf8')); }
        catch(error) { if (error.code !== 'ENOENT') throw new Error('storage'); ledger = newLedger(); }
        if (ledger.version !== 1 || !ledger.books || !Array.isArray(ledger.turns) || !ledger.seen || !Number.isSafeInteger(ledger.seq)) throw new Error('storage');
        const value = change(ledger);
        if (!write) return value;
        temp = this.path + '.' + randomUUID() + '.tmp';
        await writeFile(temp,JSON.stringify(ledger),{encoding:'utf8',mode:0o600});
        await rename(temp,this.path); temp = null;
        return value;
      } finally {
        if (temp) await unlink(temp).catch(() => {});
        await lock.close(); await unlink(lockPath).catch(() => {});
      }
    });
    this.pending = operation;
    return operation;
  }
}
