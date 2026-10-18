/** Decimal arithmetic preserves the precision of the provider's money strings. */
export function decimal(value) {
  if (typeof value !== 'string' || !/^-?\d{1,24}(?:\.\d{1,18})?$/.test(value)) throw new Error('protocol');
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = value.replace(/^-/, '').split('.');
  return { units: BigInt(integer + fraction) * (negative ? -1n : 1n), scale: fraction.length };
}

export function sumMoney(values) {
  const numbers = values.map(decimal);
  const scale = Math.max(0, ...numbers.map(n => n.scale));
  const units = numbers.reduce((sum, n) => sum + n.units * 10n ** BigInt(scale - n.scale), 0n);
  const digits = (units < 0n ? -units : units).toString().padStart(scale + 1, '0');
  return (units < 0n ? '-' : '') + (scale ? digits.slice(0, -scale) + '.' + digits.slice(-scale) : digits);
}

/** Display two decimals, with an explicit sub-cent amount instead of a false zero. */
export function formatMoney(value, currency) {
  const { units, scale } = decimal(value);
  const magnitude = units < 0n ? -units : units;
  const symbol = currency === 'CNY' ? '¥' : '$';
  if (magnitude !== 0n && scale > 2 && magnitude < 10n ** BigInt(scale - 2)) {
    return units < 0n ? `−<${symbol}0.01` : `<${symbol}0.01`;
  }
  const cents = scale > 2 ? magnitude / 10n ** BigInt(scale - 2) : magnitude * 10n ** BigInt(2 - scale);
  const digits = cents.toString().padStart(3, '0');
  const integer = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${units < 0n ? '−' : ''}${symbol}${integer}.${digits.slice(-2)}`;
}

export function lowBalance(value, currency) {
  const { units, scale } = decimal(value);
  return units <= BigInt(currency === 'CNY' ? 5 : 1) * 10n ** BigInt(scale);
}

function wallet(value) {
  if (!value || !['CNY', 'USD'].includes(value.currency)) throw new Error('protocol');
  decimal(value.balance);
  return value;
}

export function accountBalances(result) {
  if (!result || result.status !== 'ready' || !Array.isArray(result.value) || !Array.isArray(result.bonusWallets)) throw new Error('protocol');
  const paid = result.value.map(wallet);
  const gifts = result.bonusWallets.map(wallet);
  const currencies = [...new Set([...paid, ...gifts].map(w => w.currency))];
  if (currencies.length === 0) throw new Error('protocol');
  return currencies.map(currency => {
    const toppedUp = sumMoney(paid.filter(w => w.currency === currency).map(w => w.balance));
    const granted = sumMoney(gifts.filter(w => w.currency === currency).map(w => w.balance));
    return { currency, toppedUp, granted, total: sumMoney([toppedUp, granted]) };
  });
}

export function apiBalances(data) {
  if (!data || typeof data.is_available !== 'boolean' || !Array.isArray(data.balance_infos) || data.balance_infos.length === 0) throw new Error('protocol');
  const seen = new Set();
  return data.balance_infos.map(info => {
    if (!info || !['CNY', 'USD'].includes(info.currency) || seen.has(info.currency)) throw new Error('protocol');
    seen.add(info.currency);
    for (const key of ['total_balance', 'granted_balance', 'topped_up_balance']) decimal(info[key]);
    return { currency: info.currency, total: info.total_balance, granted: info.granted_balance, toppedUp: info.topped_up_balance };
  });
}
