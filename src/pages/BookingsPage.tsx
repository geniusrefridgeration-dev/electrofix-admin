import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, Eye, ChevronLeft, ChevronRight, MapPin, Phone, Wrench, Clock, CheckCircle, XCircle, Truck, AlertCircle } from 'lucide-react'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUSES = ['', 'pending', 'accepted', 'dispatched', 'completed', 'rejected']

const REJECTION_REASONS_DEFAULT = [
  'Service area not covered',
  'Technician not available',
  'Incorrect details provided',
  'Service not provided for this appliance',
  'Customer unreachable',
]

interface Booking {
  _id: string
  bookingId: string
  status: string
  customerSnapshot: { name: string; mobile: string; address: { fullAddress?: string; street: string; city: string } }
  service: { serviceName: string; categoryName?: string; problemName: string; problemPrice?: number; isPriceFixed: boolean }
  homeVisitCharge: number
  distanceKm: number
  createdAt: string
  rejectionReason?: string
}

export default function BookingsPage() {
  const t = useT()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [rejectionReasons, setRejectionReasons] = useState<string[]>(REJECTION_REASONS_DEFAULT)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      const res = await api.get(`/admin/bookings?${params}`)
      setBookings(res.data.bookings)
      setTotalPages(res.data.pages)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  useEffect(() => {
    api.get('/admin/bookings/rejection-reasons').then((res) => {
      setRejectionReasons(res.data.reasons.map((r: any) => r.en))
    }).catch(() => {})
  }, [])

  const openDetail = (b: Booking) => { setSelected(b); setShowDetail(true); setRejectionReason(''); setCustomReason('') }

  const updateStatus = async (newStatus: string) => {
    if (!selected) return
    const finalReason = rejectionReason || customReason
    if (newStatus === 'rejected' && !finalReason) {
      toast.error('Please provide a rejection reason')
      return
    }
    setUpdatingStatus(true)
    try {
      await api.put(`/admin/bookings/${selected._id}/status`, {
        status: newStatus,
        rejectionReason: finalReason || undefined,
        rejectionType: rejectionReason ? 'predefined' : 'custom',
      })
      toast.success(`Booking ${newStatus} successfully`)
      setShowDetail(false)
      fetchBookings()
    } finally {
      setUpdatingStatus(false)
    }
  }

  const nextStatuses: Record<string, { label: string; value: string; variant: 'primary' | 'danger' | 'secondary' }[]> = {
    pending:   [{ label: t('confirmAccept'), value: 'accepted', variant: 'primary' }, { label: t('confirmReject'), value: 'rejected', variant: 'danger' }],
    accepted:  [{ label: t('confirmDispatch'), value: 'dispatched', variant: 'primary' }, { label: t('confirmReject'), value: 'rejected', variant: 'danger' }],
    dispatched:[{ label: t('confirmComplete'), value: 'completed', variant: 'primary' }],
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)]">{t('bookings')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total} total bookings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="input-field pl-9"
            placeholder={t('search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <select
            className="input-field pl-9 pr-8 appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg)]">
              <tr>
                {[t('bookingId'), t('customer'), t('service'), t('status'), t('date'), t('actions')].map((h) => (
                  <th key={h} className="table-header text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[var(--text-muted)] text-sm">{t('noData')}</td></tr>
              ) : bookings.map((b) => (
                <tr key={b._id} className="table-row" onClick={() => openDetail(b)}>
                  <td className="table-cell">
                    <span className="font-mono text-xs font-semibold text-primary-500">{b.bookingId}</span>
                  </td>
                  <td className="table-cell">
                    <p className="font-medium text-sm">{b.customerSnapshot?.name}</p>
                    <a
                      href={`tel:${b.customerSnapshot?.mobile}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-primary-500 hover:text-primary-600 hover:underline font-medium flex items-center gap-1 w-fit"
                    >
                      <Phone size={10} /> {b.customerSnapshot?.mobile}
                    </a>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm">{b.service?.serviceName}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">{b.service?.problemName}</p>
                  </td>
                  <td className="table-cell">
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </td>
                  <td className="table-cell text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {format(new Date(b.createdAt), 'dd MMM yyyy')}
                    <br />{format(new Date(b.createdAt), 'hh:mm a')}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail(b) }}
                      className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-[var(--border)] disabled:opacity-40 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-[var(--border)] disabled:opacity-40 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h2 className="font-display font-bold text-[var(--text)]">Booking #{selected.bookingId}</h2>
                <span className={`badge badge-${selected.status} mt-1`}>{selected.status}</span>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Customer Info */}
              <div className="card p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Customer</h3>
                <div className="flex items-center gap-2 text-sm text-[var(--text)]">
                  <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 font-semibold text-xs">
                    {selected.customerSnapshot?.name?.charAt(0)}
                  </div>
                  <span className="font-medium">{selected.customerSnapshot?.name}</span>
                </div>
                <a
                  href={`tel:${selected.customerSnapshot?.mobile}`}
                  className="flex items-center gap-2 text-sm font-semibold text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg px-3 py-2 transition-colors w-fit"
                >
                  <Phone size={14} />
                  <span>{selected.customerSnapshot?.mobile}</span>
                  <span className="text-xs text-primary-400 font-normal ml-1">Tap to call</span>
                </a>
                <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{selected.customerSnapshot?.address?.fullAddress || `${selected.customerSnapshot?.address?.street}, ${selected.customerSnapshot?.address?.city}`}</span>
                </div>
              </div>

              {/* Service Info */}
              <div className="card p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Service</h3>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <Wrench size={13} className="text-primary-500" />
                  {selected.service?.serviceName}
                  {selected.service?.categoryName && <span className="text-[var(--text-muted)]">→ {selected.service.categoryName}</span>}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{selected.service?.problemName}</p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="text-sm">
                    <span className="text-[var(--text-muted)]">Repair: </span>
                    <span className="font-medium text-[var(--text)]">
                      {selected.service?.isPriceFixed && selected.service?.problemPrice
                        ? `₹${selected.service.problemPrice}`
                        : 'After inspection'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--text-muted)]">Visit: </span>
                    <span className="font-medium text-[var(--text)]">₹{selected.homeVisitCharge}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">({selected.distanceKm} km)</span>
                  </div>
                </div>
              </div>

              {/* Rejection reason if rejected */}
              {selected.status === 'rejected' && selected.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{selected.rejectionReason}</p>
                </div>
              )}

              {/* Status Update */}
              {nextStatuses[selected.status] && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('updateStatus')}</h3>

                  {/* Show rejection form if reject button exists */}
                  {nextStatuses[selected.status].some(s => s.value === 'rejected') && (
                    <div className="space-y-2">
                      <select
                        className="input-field text-sm"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      >
                        <option value="">{t('selectReason')}</option>
                        {rejectionReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input
                        className="input-field text-sm"
                        placeholder={t('orTypeReason')}
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {nextStatuses[selected.status].map(({ label, value, variant }) => (
                      <button
                        key={value}
                        onClick={() => updateStatus(value)}
                        disabled={updatingStatus}
                        className={clsx(
                          variant === 'primary' ? 'btn-primary' :
                          variant === 'danger' ? 'btn-danger' : 'btn-secondary'
                        )}
                      >
                        {updatingStatus ? '...' : label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
