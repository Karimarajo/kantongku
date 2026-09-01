import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';
import { ActivityLogEntry } from '../types';
import {
  Lock,
  ArrowRight,
  LogOut,
  CheckCircle2,
  XCircle,
  UserPlus,
  Ban,
  RotateCcw,
  Trash2,
  Wallet,
  ShoppingBag,
  Users2,
  Hourglass,
  TimerOff,
  Percent,
  CalendarDays,
  Send,
  History,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  X,
  Mail,
} from 'lucide-react';

interface Order {
  id: string;
  order_code: string;
  name: string;
  email: string;
  // 'doku' for every new order; 'qris_shopee'/'transfer_bca' only appear on
  // historical orders from before that migration (see db/schema.sql).
  channel: 'doku' | 'qris_shopee' | 'transfer_bca';
  base_amount: string;
  unique_code: number;
  total_amount: string;
  status: string;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  // Marketing attribution captured at order time — null for organic traffic.
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  // Task 2 revision: a collaborator-seat order reuses this same table.
  order_type: 'license' | 'collaborator';
  collaborator_owner_user_id: string | null;
  collaborator_email: string | null;
  collaborator_owner_email: string | null; // joined server-side
}

interface AdminUser {
  id: string;
  email: string;
  status: string;
  joined_at: string;
  activated_at: string | null;
  last_active_at: string | null;
}

interface AdminCollaborator {
  id: string;
  owner_user_id: string;
  owner_email: string;
  email: string;
  status: 'pending_payment' | 'active' | 'revoked';
  invited_at: string;
  activated_at: string | null;
  disconnected_at: string | null;
  disconnected_by: 'owner' | 'admin' | null;
  order_id: string | null;
}

interface DashboardStats {
  totalRevenue: number;
  successfulOrders: number;
  activeUsers: number;
  pendingOrders: number;
  expiredOrders: number;
  cancelledOrders: number;
  totalOrders: number;
  conversionRate: number;
  dailySignups: { day: string; count: number }[];
}

interface PageViewRow {
  id: string;
  path: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visited_at: string;
}

interface AnalyticsBreakdownRow {
  label: string;
  count: number;
}

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  rows: PageViewRow[];
  rowsTruncated: boolean;
  countryBreakdown: AnalyticsBreakdownRow[];
  browserBreakdown: AnalyticsBreakdownRow[];
  deviceBreakdown: AnalyticsBreakdownRow[];
}

// Palet warna tetap (bukan acak) supaya urutan legend konsisten antar render
// — dipakai bergiliran per baris breakdown di chart lokasi/browser/device.
const ANALYTICS_CHART_COLORS = ['#4EDEA3', '#38BDF8', '#F59E0B', '#F472B6', '#A78BFA', '#FB923C', '#2DD4BF', '#94A3B8'];

// Horizontal bar chart generik berbasis count (bukan Rupiah) — dipakai untuk
// breakdown lokasi/browser/device di tab Analytics. Terpisah dari
// DonutChart.tsx yang center-label-nya di-hardcode formatRupiah, jadi tidak
// cocok dipakai ulang langsung untuk data non-uang seperti ini.
function AnalyticsBarChart({ title, data }: { title: string; data: AnalyticsBreakdownRow[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="glass-card rounded-xl p-4 border border-white/5 flex flex-col gap-3">
      <h3 className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-wider">{title}</h3>
      {total === 0 ? (
        <p className="text-xs text-on-surface-variant/50 py-4 text-center">Belum ada data.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((d, idx) => {
            const percent = Math.round((d.count / total) * 100);
            return (
              <div key={d.label} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] gap-2">
                  <span className="text-white/85 truncate">{d.label}</span>
                  <span className="text-on-surface-variant font-mono-data shrink-0">{d.count} ({percent}%)</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: ANALYTICS_CHART_COLORS[idx % ANALYTICS_CHART_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SupportMessage {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  created_at: string;
  admin_reply: string | null;
  replied_at: string | null;
}

type Tab = 'dashboard' | 'orders' | 'users' | 'analytics' | 'support';

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount));

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

// Every NEW order is 'doku' (Doku Checkout, automatic). Historical orders
// can still carry 'qris_shopee'/'transfer_bca' from before that migration —
// those rows are never rewritten (see db/schema.sql's NOT VALID channel
// constraint), so this label needs to keep telling them apart for the
// order history table below.
const channelLabel = (channel: string) => {
  if (channel === 'doku') return 'Doku (Otomatis)';
  return 'QRIS (arsip)';
};

export default function AdminConsole() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [adminCollaborators, setAdminCollaborators] = useState<AdminCollaborator[]>([]);
  const [collabActionId, setCollabActionId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loginLinkNotice, setLoginLinkNotice] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  // Analytics tab (page views)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');

  // Support inbox tab
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  // Per-user Activity Log modal (Task 3a)
  const [activityLogModal, setActivityLogModal] = useState<{ email: string; entries: ActivityLogEntry[] } | null>(null);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [activityLogError, setActivityLogError] = useState('');

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

  const loadAdminCollaborators = async () => {
    const res = await fetch('/api/admin/collaborators', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setAdminCollaborators(await res.json());
  };

  // Independent of the owner (support/moderation) — reuses the same free
  // reconnect logic as the owner-facing route, just under admin auth.
  const handleAdminConnectCollaborator = async (id: string) => {
    setCollabActionId(id);
    try {
      const res = await fetch(`/api/admin/collaborators/${id}/connect`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal connect kolaborator');
      await loadAdminCollaborators();
    } catch (err: any) {
      setActionError(err.message || 'Gagal connect kolaborator');
    } finally {
      setCollabActionId(null);
    }
  };

  const handleAdminDisconnectCollaborator = async (id: string) => {
    setCollabActionId(id);
    try {
      const res = await fetch(`/api/admin/collaborators/${id}/disconnect`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal disconnect kolaborator');
      await loadAdminCollaborators();
    } catch (err: any) {
      setActionError(err.message || 'Gagal disconnect kolaborator');
    } finally {
      setCollabActionId(null);
    }
  };

  // Task 9 — separate, irreversible action from Disconnect above: hard-
  // deletes the row (no order_id left behind), so a future re-invite of the
  // same email is treated as brand new (pay again), not a free reconnect.
  // Explicit confirm() dialog since there's no undo, mirroring the pattern
  // already used for delete-category/delete-pocket confirmations elsewhere.
  const handleAdminDeleteCollaborator = async (id: string, email: string) => {
    if (!confirm(`Hapus PERMANEN kolaborator "${email}"? Tindakan ini tidak bisa dibatalkan — baris datanya hilang total dari database, dan kalau diundang ulang nanti akan dianggap kolaborator baru (harus bayar lagi, bukan gratis sambung ulang).`)) {
      return;
    }
    setCollabActionId(id);
    try {
      const res = await fetch(`/api/admin/collaborators/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menghapus permanen kolaborator');
      await loadAdminCollaborators();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus permanen kolaborator');
    } finally {
      setCollabActionId(null);
    }
  };

  const loadDashboard = async () => {
    const res = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setStats(await res.json());
  };

  const loadAnalytics = async () => {
    const params = new URLSearchParams();
    if (analyticsFrom) params.set('from', analyticsFrom);
    if (analyticsTo) params.set('to', analyticsTo);
    const qs = params.toString();
    const res = await fetch(`/api/admin/analytics/pageviews${qs ? `?${qs}` : ''}`, { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setAnalytics(await res.json());
  };

  const loadSupportMessages = async () => {
    const res = await fetch('/api/admin/support', { credentials: 'include' });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (res.ok) setSupportMessages(await res.json());
  };

  const handleViewActivityLog = async (id: string, email: string) => {
    setActivityLogError('');
    setActivityLogLoading(true);
    setActivityLogModal({ email, entries: [] });
    try {
      const res = await fetch(`/api/admin/users/${id}/activity-log`, { credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal memuat log aktivitas');
      const entries: ActivityLogEntry[] = await res.json();
      const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogModal({ email, entries: sorted });
    } catch (err: any) {
      setActivityLogError(err.message || 'Gagal memuat log aktivitas');
    } finally {
      setActivityLogLoading(false);
    }
  };

  const handleUpdateSupportStatus = async (id: string, status: SupportMessage['status']) => {
    setActionError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/support/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal memperbarui status pesan');
      await loadSupportMessages();
    } catch (err: any) {
      setActionError(err.message || 'Gagal memperbarui status pesan');
    } finally {
      setBusyId(null);
    }
  };

  // UNLIKE handleUpdateSupportStatus above (silent/best-effort is fine there),
  // a failed email send here MUST surface to the admin — they're actively
  // replying to a real customer and need to know right away, not find out
  // days later. Server saves admin_reply either way; only emailSent reflects
  // whether the customer actually got it.
  const handleSendReply = async (id: string) => {
    const message = (replyDrafts[id] || '').trim();
    if (!message) return;
    setReplyErrors((prev) => ({ ...prev, [id]: '' }));
    setReplyingId(id);
    try {
      const res = await fetch(`/api/admin/support/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan');
      if (!data.emailSent) {
        setReplyErrors((prev) => ({ ...prev, [id]: `Balasan tersimpan, tapi email GAGAL terkirim: ${data.emailError || 'kesalahan tidak diketahui'}` }));
      }
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      await loadSupportMessages();
    } catch (err: any) {
      setReplyErrors((prev) => ({ ...prev, [id]: err.message || 'Gagal mengirim balasan' }));
    } finally {
      setReplyingId(null);
    }
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
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'orders') loadOrders();
    if (tab === 'users') { loadUsers(); loadAdminCollaborators(); }
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'support') loadSupportMessages();
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

  const handleDeleteOrder = async (order_code: string) => {
    if (!window.confirm(`Hapus permanen order "${order_code}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError('');
    setBusyId(order_code);
    try {
      const res = await fetch(`/api/admin/orders/${order_code}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menghapus order');
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus order');
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

  const handleSendLoginLink = async (id: string) => {
    setActionError('');
    setLoginLinkNotice(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/send-login-link`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal mengirim link login');
      setLoginLinkNotice({ id, message: 'Email terkirim', ok: true });
    } catch (err: any) {
      setLoginLinkNotice({ id, message: err.message || 'Gagal mengirim link login', ok: false });
    } finally {
      setBusyId(null);
      setTimeout(() => setLoginLinkNotice((cur) => (cur?.id === id ? null : cur)), 4000);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Hapus permanen akun "${email}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menghapus user');
      await loadUsers();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghapus user');
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
            onClick={() => setTab('dashboard')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
          >
            Dashboard
          </button>
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
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setTab('support')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'support' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'}`}
          >
            Pesan Masuk
            {supportMessages.filter((m) => m.status === 'new').length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {supportMessages.filter((m) => m.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {actionError && (
          <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
            {actionError}
          </span>
        )}

        {tab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {!stats ? (
              <p className="text-sm text-on-surface-variant/60">Memuat statistik...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Total Pendapatan</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Pembelian Sukses</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.successfulOrders}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Users2 className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Akun Aktif</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.activeUsers}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Percent className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Tingkat Konversi</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.conversionRate}%</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Hourglass className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Order Menunggu</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.pendingOrders}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <TimerOff className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Order Kedaluwarsa</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.expiredOrders}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Order Dibatalkan</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.cancelledOrders}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Total Order Dibuat</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{stats.totalOrders}</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                  <p className="text-sm text-on-surface-variant">
                    Jumlah transaksi tercatat di aplikasi: <span className="font-semibold text-white">belum tersedia</span> — akan
                    aktif setelah data transaksi dipindah dari localStorage ke database.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-white">Pendaftaran Baru (7 Hari Terakhir)</h3>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-variant/40 text-left text-on-surface-variant text-xs uppercase font-label-caps tracking-wider">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Jumlah Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.dailySignups.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-4 py-6 text-center text-on-surface-variant/60">
                              Belum ada order dalam 7 hari terakhir.
                            </td>
                          </tr>
                        )}
                        {stats.dailySignups.map((row) => (
                          <tr key={row.day} className="border-t border-white/5">
                            <td className="px-4 py-3 text-on-surface-variant">{row.day}</td>
                            <td className="px-4 py-3 font-semibold text-white">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/40 text-left text-on-surface-variant text-xs uppercase font-label-caps tracking-wider">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Sumber</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-on-surface-variant/60">
                      Tidak ada order pending.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      {o.order_type === 'collaborator' ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300 uppercase tracking-wider whitespace-nowrap">
                          Kolaborator
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                          Lisensi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {o.order_type === 'collaborator' ? (
                        <div className="flex flex-col">
                          <span className="text-white">Kolaborator</span>
                          <span className="text-[10px] text-on-surface-variant" title="Akun pemilik">untuk: {o.collaborator_owner_email || '-'}</span>
                        </div>
                      ) : (
                        o.name
                      )}
                    </td>
                    <td className="px-4 py-3">{o.order_type === 'collaborator' ? o.collaborator_email : o.email}</td>
                    <td className="px-4 py-3">{channelLabel(o.channel)}</td>
                    <td className="px-4 py-3">
                      {o.utm_source ? (
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 whitespace-nowrap"
                          title={[o.utm_medium, o.utm_content, o.utm_term].filter(Boolean).join(' · ') || undefined}
                        >
                          {o.utm_source}{o.utm_campaign ? ` / ${o.utm_campaign}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-on-surface-variant">
                          Organik
                        </span>
                      )}
                    </td>
                    <td className="font-mono-data px-4 py-3 text-lg font-bold text-white whitespace-nowrap">
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {/* An order already settled (confirmed moments ago by
                          someone else, e.g. two admin tabs open) shows a
                          status badge instead of the action buttons, so it
                          can't be double-confirmed/double-emailed from here.
                          The backend (confirmOrderRecord) is idempotent
                          regardless — this is a UI nicety on top of that,
                          not the only thing preventing a double-fire. */}
                      {o.status === 'settlement' ? (
                        <span className="text-[10px] font-bold px-2 py-1.5 rounded-lg uppercase tracking-wider whitespace-nowrap bg-white/5 text-on-surface-variant">
                          Terkonfirmasi
                        </span>
                      ) : (
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
                        <button
                          onClick={() => handleDeleteOrder(o.order_code)}
                          disabled={busyId === o.order_code}
                          title="Hapus permanen — tidak bisa dibatalkan"
                          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      )}
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
                    <th className="px-4 py-3">Terakhir Aktif</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant/60">
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
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(u.last_active_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleViewActivityLog(u.id, u.email)}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" /> Lihat Log Aktivitas
                          </button>
                          <button
                            onClick={() => handleSendLoginLink(u.id)}
                            disabled={busyId === u.id}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" /> Kirim Link Login
                          </button>
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
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={busyId === u.id}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                          {loginLinkNotice?.id === u.id && (
                            <span className={`text-xs font-semibold ${loginLinkNotice.ok ? 'text-primary' : 'text-rose-400'}`}>
                              {loginLinkNotice.message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kolaborator per akun owner (Task 2 revision) — admin bisa
                connect/disconnect langsung, independen dari aksi owner. */}
            <div className="flex flex-col gap-3 mt-2">
              <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Kolaborator per Akun</span>
              {adminCollaborators.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 px-1">Belum ada kolaborator.</p>
              ) : (
                Object.entries(
                  adminCollaborators.reduce<Record<string, AdminCollaborator[]>>((acc, c) => {
                    (acc[c.owner_email] = acc[c.owner_email] || []).push(c);
                    return acc;
                  }, {})
                ).map(([ownerEmail, list]) => (
                  <div key={ownerEmail} className="bg-surface-variant/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5 text-primary" /> {ownerEmail}
                    </span>
                    <div className="flex flex-col gap-2">
                      {list.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
                          <div className="min-w-0 flex flex-col">
                            <span className="text-xs text-white truncate">{c.email}</span>
                            <span className="text-[10px] text-on-surface-variant">
                              {c.status === 'active'
                                ? `Aktif sejak ${formatDateTime(c.activated_at)}`
                                : c.status === 'pending_payment'
                                ? 'Menunggu pembayaran'
                                : `Terputus ${formatDateTime(c.disconnected_at)} (oleh ${c.disconnected_by === 'admin' ? 'admin' : 'owner'})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                c.status === 'active'
                                  ? 'bg-primary/10 text-primary'
                                  : c.status === 'pending_payment'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {c.status === 'active' ? 'Aktif' : c.status === 'pending_payment' ? 'Pending' : 'Terputus'}
                            </span>
                            {c.status === 'active' && (
                              <button
                                onClick={() => handleAdminDisconnectCollaborator(c.id)}
                                disabled={collabActionId === c.id}
                                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                              >
                                Disconnect
                              </button>
                            )}
                            {c.status === 'revoked' && c.order_id && (
                              <button
                                onClick={() => handleAdminConnectCollaborator(c.id)}
                                disabled={collabActionId === c.id}
                                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                              >
                                Connect
                              </button>
                            )}
                            {/* Task 9 — deliberately separate button from
                                Disconnect above: this hard-deletes the row
                                (irreversible, confirm() dialog inside the
                                handler), Disconnect just revokes status and
                                keeps the row/order_id around for a free
                                reconnect later. Always available regardless
                                of current status. */}
                            <button
                              onClick={() => handleAdminDeleteCollaborator(c.id, c.email)}
                              disabled={collabActionId === c.id}
                              title="Hapus permanen — tidak bisa dibatalkan"
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus Permanen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3 bg-surface-variant/40 border border-white/10 rounded-xl p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">Dari</label>
                <input
                  type="date"
                  value={analyticsFrom}
                  onChange={(e) => setAnalyticsFrom(e.target.value)}
                  className="h-10 bg-[#0B111E] border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-primary/60"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">Sampai</label>
                <input
                  type="date"
                  value={analyticsTo}
                  onChange={(e) => setAnalyticsTo(e.target.value)}
                  className="h-10 bg-[#0B111E] border border-white/10 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-primary/60"
                />
              </div>
              <button
                onClick={loadAnalytics}
                className="h-10 px-4 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all"
              >
                Terapkan Filter
              </button>
              {(analyticsFrom || analyticsTo) && (
                <button
                  onClick={() => { setAnalyticsFrom(''); setAnalyticsTo(''); setTimeout(loadAnalytics, 0); }}
                  className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-on-surface-variant hover:text-white transition-all"
                >
                  Reset (30 Hari Terakhir)
                </button>
              )}
            </div>

            {!analytics ? (
              <p className="text-sm text-on-surface-variant/60">Memuat analitik...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Globe className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Total Page View</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{analytics.totalViews}</p>
                  </div>
                  <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Users2 className="w-4 h-4" />
                      <span className="text-xs font-label-caps uppercase tracking-wider">Unique Visitor</span>
                    </div>
                    <p className="font-mono-data text-2xl font-bold text-white">{analytics.uniqueVisitors}</p>
                  </div>
                </div>

                {/* Breakdown lokasi/browser/device — bukan umur/kelamin: app ini
                    login via Google OAuth dan tidak pernah meminta data itu ke
                    user, jadi tidak ada sumber data untuk dua dimensi tersebut. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnalyticsBarChart title="Lokasi (Negara)" data={analytics.countryBreakdown} />
                  <AnalyticsBarChart title="Browser" data={analytics.browserBreakdown} />
                  <AnalyticsBarChart title="Device" data={analytics.deviceBreakdown} />
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-variant/40 text-left text-on-surface-variant text-xs uppercase font-label-caps tracking-wider">
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Path</th>
                        <th className="px-4 py-3">Lokasi</th>
                        <th className="px-4 py-3">Device</th>
                        <th className="px-4 py-3">Browser / OS</th>
                        <th className="px-4 py-3">Referrer</th>
                        <th className="px-4 py-3">UTM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-on-surface-variant/60">
                            Belum ada kunjungan pada rentang ini.
                          </td>
                        </tr>
                      )}
                      {analytics.rows.map((r) => {
                        const DeviceIcon = r.device_type === 'mobile' ? Smartphone : r.device_type === 'tablet' ? Tablet : Monitor;
                        return (
                          <tr key={r.id} className="border-t border-white/5">
                            <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(r.visited_at)}</td>
                            <td className="px-4 py-3 font-mono text-xs">{r.path}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {r.city || r.country ? `${r.city || '-'}, ${r.country || '-'}` : (
                                <span className="text-on-surface-variant/40">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <DeviceIcon className="w-3.5 h-3.5" /> {r.device_type || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-on-surface-variant">{r.browser || '-'} / {r.os || '-'}</td>
                            <td className="px-4 py-3 max-w-[160px] truncate text-xs text-on-surface-variant" title={r.referrer || undefined}>
                              {r.referrer || <span className="text-on-surface-variant/40">Langsung</span>}
                            </td>
                            <td className="px-4 py-3">
                              {r.utm_source ? (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 whitespace-nowrap">
                                  {r.utm_source}{r.utm_campaign ? ` / ${r.utm_campaign}` : ''}
                                </span>
                              ) : (
                                <span className="text-xs text-on-surface-variant/40">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {analytics.rowsTruncated && (
                    <p className="text-[11px] text-on-surface-variant/50 px-4 py-3 border-t border-white/5">
                      Menampilkan 300 kunjungan terbaru pada rentang ini — persempit rentang tanggal untuk melihat lebih detail.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'support' && (
          <div className="flex flex-col gap-3">
            {supportMessages.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60 px-1">Belum ada pesan masuk.</p>
            ) : (
              supportMessages.map((m) => (
                <div key={m.id} className="bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{m.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            m.status === 'new'
                              ? 'bg-rose-500/15 text-rose-300'
                              : m.status === 'read'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {m.status === 'new' ? 'Baru' : m.status === 'read' ? 'Sudah Dibaca' : 'Sudah Dibalas'}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {m.email}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-on-surface-variant">{m.category}</span>
                      <span className="text-[11px] text-on-surface-variant/50">{formatDateTime(m.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{m.message}</p>

                  {/* Balasan yang sudah terkirim — read-only */}
                  {m.admin_reply && (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-label-caps text-primary/80 uppercase tracking-wider">
                        Balasan Admin {m.replied_at ? `· ${formatDateTime(m.replied_at)}` : ''}
                      </span>
                      <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{m.admin_reply}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {m.status !== 'read' && (
                      <button
                        onClick={() => handleUpdateSupportStatus(m.id, 'read')}
                        disabled={busyId === m.id}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Sudah Dibaca
                      </button>
                    )}
                    {m.status !== 'replied' && !m.admin_reply && (
                      <button
                        onClick={() => handleUpdateSupportStatus(m.id, 'replied')}
                        disabled={busyId === m.id}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        title="Tandai selesai tanpa mengirim email balasan (mis. sudah dibalas via WhatsApp)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Sudah Dibalas
                      </button>
                    )}
                  </div>

                  {/* Form balas via email — selalu tersedia, bisa dipakai lagi
                      untuk kirim balasan susulan meski sudah pernah dibalas. */}
                  <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                    <label className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">
                      {m.admin_reply ? 'Kirim Balasan Susulan' : 'Balas via Email'}
                    </label>
                    <textarea
                      value={replyDrafts[m.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="Tulis balasan untuk customer ini..."
                      rows={3}
                      className="w-full bg-[#0B111E] border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 resize-none"
                    />
                    {replyErrors[m.id] && (
                      <span className="text-xs text-rose-400 block px-1">{replyErrors[m.id]}</span>
                    )}
                    <button
                      onClick={() => handleSendReply(m.id)}
                      disabled={replyingId === m.id || !(replyDrafts[m.id] || '').trim()}
                      className="self-start flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> {replyingId === m.id ? 'Mengirim...' : 'Kirim Balasan'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Per-user Activity Log modal (Task 3a) */}
      {activityLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActivityLogModal(null)} />
          <div className="relative bg-[#0F172A] border border-white/10 rounded-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-white font-bold text-sm">Log Aktivitas — {activityLogModal.email}</h3>
              </div>
              <button onClick={() => setActivityLogModal(null)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {activityLogLoading ? (
              <p className="text-sm text-on-surface-variant/60 py-6 text-center">Memuat...</p>
            ) : activityLogError ? (
              <p className="text-sm text-rose-400 py-6 text-center">{activityLogError}</p>
            ) : activityLogModal.entries.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60 py-6 text-center">Belum ada aktivitas tercatat untuk user ini.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {activityLogModal.entries.map((entry) => (
                  <div key={entry.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-0.5">
                    <p className="text-sm text-white leading-snug">{entry.message}</p>
                    <p className="text-[10px] text-on-surface-variant/50 font-mono">{formatDateTime(entry.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
