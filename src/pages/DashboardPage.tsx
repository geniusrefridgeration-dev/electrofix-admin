import { useEffect, useState } from 'react'
import {
  CalendarCheck, Users, TrendingUp, Clock, CheckCircle,
  XCircle, Truck, IndianRupee, Star, Wrench, Ban, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import { format } from 'date-fns'
import clsx from 'clsx'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  pending:   { label: 'Pending',    color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',   bar: '#F59E0B' },
  accepted:  { label: 'Accepted',   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',     bar: '#3B82F6' },
  rejected:  { label: 'Rejected',   color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       bar: '#EF4444' },
  dispatched:{ label: 'Dispatched', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', bar: '#8B5CF6' },
  completed: { label: 'Completed',  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',   bar: '#22C55E' },
  cancelled: { label: 'Cancelled',  color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-900/20',     bar: '#9CA3AF' },
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n/1000).toFixed(1)}K`
  return `₹${n}`
}

export default function DashboardPage() {
  const t = useT()
  const [stats,   setStats]   = useState<any>(null)
  const [recent,  setRecent]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/bookings/stats'),
      api.get('/admin/bookings?limit=5&sort=-createdAt'),
    ]).then(([s, b]) => {
      setStats(s.data.stats)
      setRecent(b.data.bookings || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const chartData = (stats?.monthlyTrend || []).map((d: any) => ({
    name:     MONTH_NAMES[d._id.month - 1],
    bookings: d.count,
    revenue:  d.revenue || 0,
  }))

  const statusData = (stats?.statusBreakdown || []).map((d: any) => ({
    name:  STATUS_CFG[d._id]?.label || d._id,
    count: d.count,
    color: STATUS_CFG[d._id]?.bar || '#94A3B8',
  }))

  const rev = stats?.revenue || {}
  const rating = stats?.rating || {}

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)]">{t('dashboard')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* ── TOP STAT CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Bookings", value: stats?.today,     icon: CalendarCheck, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'This Week',        value: stats?.thisWeek,  icon: TrendingUp,    color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'This Month',       value: stats?.thisMonth, icon: BarChart2,     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Total Bookings',   value: stats?.total,     icon: Users,         color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
                <Icon size={20} className={color} />
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-[var(--text)]">{value ?? 0}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── REVENUE CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue",  value: fmt(rev.today     || 0), icon: IndianRupee, color: 'text-emerald-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Month Revenue',    value: fmt(rev.thisMonth || 0), icon: TrendingUp,  color: 'text-teal-500',     bg: 'bg-teal-50 dark:bg-teal-900/20' },
          { label: 'Total Revenue',    value: fmt(rev.total     || 0), icon: IndianRupee, color: 'text-cyan-500',     bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Avg Order Value',  value: fmt(Math.round(rev.avgOrder || 0)), icon: IndianRupee, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-display font-bold text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Monthly Bookings */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Monthly Bookings (Last 6 Months)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">No data yet</div>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Monthly Revenue (₹)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Status Breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Booking Status</h3>
          <div className="space-y-2.5">
            {statusData.map(({ name, count, color }: any) => {
              const total = stats?.total || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">{name}</span>
                    <span className="font-semibold text-[var(--text)]">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
            {statusData.length === 0 && <p className="text-sm text-[var(--text-muted)]">No bookings yet</p>}
          </div>
        </div>

        {/* Top Services */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Top Services</h3>
          <div className="space-y-3">
            {(stats?.topServices || []).map((s: any, i: number) => (
              <div key={s._id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-xs font-bold text-primary-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{s._id || 'Unknown'}</p>
                </div>
                <span className="text-sm font-bold text-[var(--text)]">{s.count}</span>
              </div>
            ))}
            {(stats?.topServices || []).length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No data yet</p>
            )}
          </div>
        </div>

        {/* Rating + Recent */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4">Customer Satisfaction</h3>
          {rating.count > 0 ? (
            <div className="text-center mb-4">
              <div className="text-4xl font-display font-black text-[var(--text)]">
                {rating.avg.toFixed(1)}
              </div>
              <div className="flex justify-center gap-0.5 my-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16}
                    className={s <= Math.round(rating.avg) ? 'text-yellow-400' : 'text-[var(--border)]'}
                    fill={s <= Math.round(rating.avg) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{rating.count} ratings</p>
            </div>
          ) : (
            <div className="text-center mb-4">
              <div className="text-4xl font-display font-black text-[var(--text)]">—</div>
              <p className="text-xs text-[var(--text-muted)] mt-1">No ratings yet</p>
            </div>
          )}
          <div className="pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Cancelled</span>
              <span className="font-semibold text-gray-500">{stats?.cancelled || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Completion Rate</span>
              <span className="font-semibold text-green-500">
                {stats?.total ? Math.round(((stats.statusBreakdown?.find((s: any) => s._id === 'completed')?.count || 0) / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT BOOKINGS ──────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--text)] mb-4">Recent Bookings</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No bookings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">ID</th>
                  <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Customer</th>
                  <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Service</th>
                  <th className="text-left py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                  <th className="text-right py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b: any) => {
                  const cfg = STATUS_CFG[b.status] || STATUS_CFG.pending
                  return (
                    <tr key={b._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)] transition-colors">
                      <td className="py-3 font-mono text-xs text-primary-500">{b.bookingId}</td>
                      <td className="py-3 text-[var(--text)]">{b.customerSnapshot?.name || '—'}</td>
                      <td className="py-3 text-[var(--text-muted)] truncate max-w-[140px]">{b.service?.serviceName}</td>
                      <td className="py-3">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-[var(--text)]">
                        {b.totalAmount ? `₹${b.totalAmount}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
