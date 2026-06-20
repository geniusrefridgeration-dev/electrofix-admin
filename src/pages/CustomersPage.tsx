import { useEffect, useState, useCallback } from 'react'
import { Search, Eye, UserCheck, UserX, Trash2, Phone, Mail, MapPin, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Customer {
  _id: string; name: string; mobile: string; email?: string
  address: { street: string; city: string; state: string; pincode: string }
  isActive: boolean; createdAt: string
}

export default function CustomersPage() {
  const t = useT()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.append('search', search)
      const res = await api.get(`/admin/customers?${params}`)
      setCustomers(res.data.customers)
      setTotalPages(res.data.pages)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/admin/customers/${id}`)
      setSelectedCustomer(res.data)
    } catch { toast.error('Failed to load customer') }
  }

  const toggleStatus = async (id: string) => {
    setSaving(true)
    try {
      const res = await api.put(`/admin/customers/${id}/toggle-status`)
      toast.success(res.data.message)
      fetchCustomers()
      if (selectedCustomer?.customer?._id === id) {
        setSelectedCustomer((prev: any) => prev ? { ...prev, customer: { ...prev.customer, isActive: res.data.isActive } } : null)
      }
    } finally { setSaving(false) }
  }

  const deleteCustomer = async (id: string) => {
    setSaving(true)
    try {
      await api.delete(`/admin/customers/${id}`)
      toast.success('Customer deleted')
      setDeleteConfirm(null)
      setSelectedCustomer(null)
      fetchCustomers()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)]">{t('customers')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          className="input-field pl-9"
          placeholder={t('search')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg)]">
              <tr>
                {[t('customerName'), t('mobile'), t('email'), t('address'), t('status'), t('joinedOn'), t('actions')].map(h => (
                  <th key={h} className="table-header text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-sm">{t('noData')}</td></tr>
              ) : customers.map((c) => (
                <tr key={c._id} className="table-row" onClick={() => openDetail(c._id)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-sm">{c.mobile}</td>
                  <td className="table-cell text-sm text-[var(--text-muted)]">{c.email || '—'}</td>
                  <td className="table-cell text-sm text-[var(--text-muted)] max-w-[160px] truncate">
                    {c.address?.city}, {c.address?.state}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${c.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {c.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {format(new Date(c.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="table-cell" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(c._id)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => toggleStatus(c._id)} className={clsx('p-1.5 rounded-lg transition-colors',
                        c.isActive ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500')}>
                        {c.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button onClick={() => setDeleteConfirm(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-[var(--border)] disabled:opacity-40 transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-[var(--border)] disabled:opacity-40 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-display font-bold text-[var(--text)]">Customer Details</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                  {selectedCustomer.customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[var(--text)] text-lg">{selectedCustomer.customer.name}</p>
                  <span className={`badge ${selectedCustomer.customer.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {selectedCustomer.customer.isActive ? t('active') : t('inactive')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1"><Phone size={13} /><span className="text-xs">Mobile</span></div>
                  <p className="font-medium text-sm text-[var(--text)]">{selectedCustomer.customer.mobile}</p>
                </div>
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1"><Mail size={13} /><span className="text-xs">Email</span></div>
                  <p className="font-medium text-sm text-[var(--text)]">{selectedCustomer.customer.email || '—'}</p>
                </div>
              </div>

              <div className="card p-3">
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1"><MapPin size={13} /><span className="text-xs">Address</span></div>
                <p className="text-sm text-[var(--text)]">
                  {selectedCustomer.customer.address?.street}, {selectedCustomer.customer.address?.city}, {selectedCustomer.customer.address?.state} - {selectedCustomer.customer.address?.pincode}
                </p>
              </div>

              <div className="card p-3">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wide">Recent Bookings</p>
                {selectedCustomer.bookings?.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No bookings yet</p>
                ) : selectedCustomer.bookings?.map((b: any) => (
                  <div key={b._id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div>
                      <span className="font-mono text-xs text-primary-500">{b.bookingId}</span>
                      <p className="text-sm text-[var(--text)]">{b.service?.serviceName}</p>
                    </div>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => toggleStatus(selectedCustomer.customer._id)} disabled={saving}
                  className={clsx('flex-1 justify-center', selectedCustomer.customer.isActive ? 'btn-danger' : 'btn-primary',
                    'flex items-center gap-2')}>
                  {selectedCustomer.customer.isActive ? <><UserX size={15}/>{t('deactivate')}</> : <><UserCheck size={15}/>{t('activate')}</>}
                </button>
                <button onClick={() => setDeleteConfirm(selectedCustomer.customer._id)} className="btn-danger justify-center flex items-center gap-2">
                  <Trash2 size={15} /> {t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <h2 className="font-display font-bold text-center text-[var(--text)] mb-2">Delete Customer?</h2>
            <p className="text-sm text-center text-[var(--text-muted)] mb-6">All their booking data will also be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              <button onClick={() => deleteCustomer(deleteConfirm)} disabled={saving} className="btn-danger flex-1 justify-center">
                {saving ? '...' : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
