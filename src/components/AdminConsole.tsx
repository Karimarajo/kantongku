import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';
import { Lock, ArrowRight, LogOut, CheckCircle2, XCircle, UserPlus, Ban, RotateCcw } from 'lucide-react';

interface Order {
  id: string;
  order_code: string;
  name: string;
  email: string;
  channel: 'qris_shopee' | 'transfer_bca';
  base_amount: string;
  unique_code: number;
  total_amount: string;
  status: string;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  status: string;
  joined_at: string;
  activated_at: string | null;
}

type Tab = 'orders' | 'users';

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount));

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

const channelLabel = (channel: string) => (channel === 'qris_shopee' ? 'QRIS ShopeePay' : 'Transfer BCA');

export default function AdminConsole() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [manualEmail, setManualEmail] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = async () => {
    const res = await fetch('/api/admin/orders?status=pending', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setOrders(await res.json());
  };

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/orders?status=pending', { credentials: 'include' });
      if (res.ok) {
        setAuthenticated(true);
        setOrders(await res.json());
      }
      setCheckingAuth(false);
    })();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (tab === 'orders') loadOrders();
    if (tab === 'users') loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Password salah');
      }
      setAuthenticated(true);
      setPassword('');
      loadOrders();
    } catch (err: any) {
      setLoginError(err.message || 'Gagal login');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setAuthenticated(false);
  };

  const handleConfirmOrder = async (order_code: string) => {
    setActionError('');
    setBusyId(order_code);
    try {
      const res = await fetch(`/api/admin/orders/${order_code}/confirm`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal konfirmasi order');
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Gagal konfirmasi order');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelOrder = async (order_code: string) => {
    setActionError('');
    setBusyId(order_code);
    try {
      const res = await fetch(`/api/admin/orders/${order_code}/cancel`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal membatalkan order');
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Gagal membatalkan order');
    } finally {
      setBusyId(null);
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;
    setActionError('');
    setBusyId('manual-activate');
    try {
      const res = await fetch('/api/admin/users/manual-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: manualEmail.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal aktivasi akun');
      setManualEmail('');
      await loadUsers();
    } catch (err: any) {
      setActionError(err.message || 'Gagal aktivasi akun');
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspend = async (id: string) => {
    setActionError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal suspend user');
      await loadUsers();
    } catch (err: any) {
      setActionError(err.message || 'Gagal suspend user');
    } finally {
      setBusyId(null);
    }
  };

  const handleReactivate = async (id: string) => {
    setActionError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/reactivate`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal mengaktifkan user');
      await loadUsers();
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengaktifkan user');
    } finally {
      setBusyId(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B111E] text-on-surface-variant">
        Memuat...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#0B111E] text-on-surface px-6 relative overflow-hidden font-body-md">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px]" />
        </div>
        <div className="w-full max-w-sm flex flex-col items-center gap-8 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 p-3 bg-surface-variant/40 rounded-3xl border border-white/5 flex items-center justify-center">
              <BrandLogo className="w-14 h-14" />
            </div>
            <h1 className="font-display-lg text-2xl text-primary font-bold tracking-tight">Admin Console</h1>
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-on-surface-variant/60">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="Password admin"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError('');
                }}
                className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
              />
            </div>
            {loginError && (
              <span className="text-xs text-rose-400 block px-2 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center">
                {loginError}
              </span>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all bg-primary text-on-primary disabled:opacity-50"
            >
              {loginLoading ? 'Memproses...' : 'Masuk'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B111E] text-on-surface font-body-md px-4 py-8 md:px-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-9 h-9" glow={false} />
            <h1 className="font-headline-md text-xl font-bold text-primary">Admin Console</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs uppercase font-label-caps tracking-wider text-rose-400 hover:text-rose-300 font-bold px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setTab('orders')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
          >
            Order Pending
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
          >
            Daftar Akun
          </button>
        </div>

        {actionError && (
          <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
            {actionError}
          </span>
        )}

        {tab === 'orders' && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/40 text-left text-on-surface-variant text-xs uppercase font-label-caps tracking-wider">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant/60">
                      Tidak ada order pending.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3">{o.name}</td>
                    <td className="px-4 py-3">{o.email}</td>
                    <td className="px-4 py-3">{channelLabel(o.channel)}</td>
                    <td className="px-4 py-3 text-lg font-bold text-white whitespace-nowrap">{formatCurrency(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmOrder(o.order_code)}
                          disabled={busyId === o.order_code}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi
                        </button>
                        <button
                          onClick={() => handleCancelOrder(o.order_code)}
                          disabled={busyId === o.order_code}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Batalkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleManualActivate} className="flex flex-wrap gap-2 items-center bg-surface-variant/40 border border-white/10 rounded-xl p-3">
              <input
                type="email"
                placeholder="Email untuk diaktifkan manual"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="flex-1 min-w-[200px] h-11 bg-[#0B111E] border border-white/10 rounded-lg px-3 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={busyId === 'manual-activate'}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-3 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" /> Tambah Akun Manual
              </button>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-variant/40 text-left text-on-surface-variant text-xs uppercase font-label-caps tracking-wider">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Bergabung</th>
                    <th className="px-4 py-3">Aktif Sejak</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant/60">
                        Belum ada akun.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            u.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : u.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-white/10 text-on-surface-variant'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(u.joined_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(u.activated_at)}</td>
                      <td className="px-4 py-3">
                        {u.status === 'suspended' ? (
                          <button
                            onClick={() => handleReactivate(u.id)}
                            disabled={busyId === u.id}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Aktifkan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(u.id)}
                            disabled={busyId === u.id}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" /> Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
