import { useEffect, useState } from 'react'
import { CalendarCheck, Users, TrendingUp, Clock, CheckCircle, XCircle, Truck, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import { format } from 'date-fns'
import clsx from 'clsx'

interface Stats {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
  statusBreakdown: { _id: string; count: number }[]
  monthlyTrend: { _id: { year: number; month: number }; count: number }[]
}

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusConfig = {
  pending:   { label: 'Pending',    icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  accepted:  { label: 'Accepted',   icon: CheckCircle,  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  rejected:  { label: 'Rejected',   icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
  dispatched:{ label: 'Dispatched', icon: Truck,        color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  completed: { label: 'Completed',  icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
}

export default function DashboardPage() {
  const t = useT()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          api.get('/admin/bookings/stats'),
          api.get('/admin/bookings?limit=5'),
        ])
        setStats(statsRes.data.stats)
        setRecentBookings(bookingsRes.data.bookings)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const chartData = stats?.monthlyTrend.map((d) => ({
    name: monthNames[d._id.month - 1],
    bookings: d.count,
  })) || []

  const statCards = [
    { label: t('todayBookings'),  value: stats?.today,     icon: CalendarCheck, color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: t('weekBookings'),   value: stats?.thisWeek,  icon: TrendingUp,    color: 'text-blue-500',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t('monthBookings'),  value: stats?.thisMonth, icon: CalendarCheck, color: 'text-purple-500',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: t('totalBookings'),  value: stats?.total,     icon: Users,         color: 'text-green-500',    bg: 'bg-green-50 dark:bg-green-900/20' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--text)]">{t('dashboard')}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-[var(--text)]">{value ?? '—'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold text-[var(--text)] mb-4">{t('bookingTrend')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'var(--border)', opacity: 0.5 }}
              />
              <Bar dataKey="bookings" radius={[6,6,0,0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? '#E53935' : '#fca5a5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-[var(--text)] mb-4">Status Overview</h2>
          <div className="space-y-3">
            {stats?.statusBreakdown.map(({ _id: status, count }) => {
              const cfg = statusConfig[status as keyof typeof statusConfig]
              if (!cfg) return null
              const Icon = cfg.icon
              return (
                <div key={status} className={clsx('flex items-center justify-between p-3 rounded-lg', cfg.bg)}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={cfg.color} />
                    <span className="text-sm font-medium text-[var(--text)]">{cfg.label}</span>
                  </div>
                  <span className={clsx('text-sm font-bold', cfg.color)}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-display font-semibold text-[var(--text)]">{t('recentBookings')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg)]">
              <tr>
                {['Booking ID', 'Customer', 'Service', 'Status', 'Date'].map((h) => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[var(--text-muted)] text-sm">{t('noData')}</td></tr>
              ) : recentBookings.map((b) => (
                <tr key={b._id} className="table-row">
                  <td className="table-cell font-mono text-xs font-medium text-primary-500">{b.bookingId}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium">{b.customerSnapshot?.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{b.customerSnapshot?.mobile}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div>
                      <p>{b.service?.serviceName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{b.service?.problemName}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </td>
                  <td className="table-cell text-[var(--text-muted)] text-xs">
                    {format(new Date(b.createdAt), 'dd MMM, hh:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
