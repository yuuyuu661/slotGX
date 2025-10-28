async function api(path, opts={}) {
  const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json()).error || 'error');
  return res.json();
}

async function refresh() {
  const me = await api('/api/me');
  document.getElementById('who').textContent = me.username + (me.is_admin ? ' (admin)' : '');
  const c = await api('/api/coins');
  document.getElementById('coins').textContent = c.coins;
}

async function showGame() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  await refresh();
}

async function showLogin(errMsg) {
  document.getElementById('game').classList.add('hidden');
  document.getElementById('login').classList.remove('hidden');
  const p = document.getElementById('loginError');
  if (errMsg) { p.textContent = errMsg; p.classList.remove('hidden'); } else { p.classList.add('hidden'); }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    showGame();
  } catch (e) { showLogin(e.message); }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  showLogin();
});

document.getElementById('mockBet').addEventListener('click', async () => {
  await api('/api/coins/debit', { method: 'POST', body: JSON.stringify({ amount: 10, reason: 'bet' }) });
  refresh();
});

document.getElementById('mockWin').addEventListener('click', async () => {
  await api('/api/coins/credit', { method: 'POST', body: JSON.stringify({ amount: 25, reason: 'payout' }) });
  refresh();
});
