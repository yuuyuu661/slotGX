<script>
window.Coins = {
  async get(){ const r = await fetch('/api/coins', {credentials:'include'}); const j = await r.json(); return BigInt(j.coins); },
  async credit(n, reason='payout'){
    const r = await fetch('/api/coins/credit', {method:'POST', credentials:'include', headers:{'content-type':'application/json'}, body: JSON.stringify({amount: Number(n), reason})});
    if(!r.ok) throw new Error((await r.json()).error||'credit error');
    return (await r.json()).coins;
  },
  async debit(n, reason='bet'){
    const r = await fetch('/api/coins/debit', {method:'POST', credentials:'include', headers:{'content-type':'application/json'}, body: JSON.stringify({amount: Number(n), reason})});
    if(!r.ok) throw new Error((await r.json()).error||'debit error');
    return (await r.json()).coins;
  }
};
</script>