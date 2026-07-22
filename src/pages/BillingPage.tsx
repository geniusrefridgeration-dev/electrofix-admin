import { useEffect, useState, useCallback } from 'react'
import { Receipt, Plus, Trash2, X, IndianRupee, CheckCircle2, Clock, Search } from 'lucide-react'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface BillItem { label: string; amount: number; quantity: number }
interface Booking {
  _id: string
  bookingId: string
  status: string
  customerSnapshot: { name: string; mobile: string }
  service: { serviceName: string; problemName: string }
  homeVisitCharge: number
  totalAmount?: number | null
  grandTotal?: number | null
  billItems?: BillItem[]
  discount?: number
  gstPercent?: number
  gstAmount?: number
  paymentStatus?: 'unpaid' | 'paid' | 'partial'
  paymentMethod?: string | null
  invoiceNumber?: string | null
  completedAt?: string
  createdAt: string
}

interface Summary {
  totalRevenue: number
  paidAmount: number
  unpaidAmount: number
  totalBills: number
  paidCount: number
  unpaidCount: number
}

function BillForm({ booking, onSubmit, loading }: { booking: Booking; onSubmit: (data: any) => void; loading: boolean }) {
  const [items, setItems] = useState<BillItem[]>(
    booking.billItems?.length ? booking.billItems : [
      { label: 'Repair Charge', amount: booking.totalAmount || 0, quantity: 1 },
      { label: 'Home Visit Charge', amount: booking.homeVisitCharge || 0, quantity: 1 },
    ]
  )
  const [discount, setDiscount] = useState(booking.discount || 0)
  const [gstPercent, setGstPercent] = useState(booking.gstPercent || 0)
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'partial'>(booking.paymentStatus || 'unpaid')
  const [paymentMethod, setPaymentMethod] = useState(booking.paymentMethod || 'cash')

  const addItem = () => setItems([...items, { label: '', amount: 0, quantity: 1 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, key: keyof BillItem, value: any) => {
    const next = [...items]
    ;(next[i] as any)[key] = key === 'label' ? value : Number(value)
    setItems(next)
  }

  const subtotal = items.reduce((s, it) => s + it.amount * (it.quantity || 1), 0)
  const afterDiscount = Math.max(0, subtotal - discount)
  const gstAmount = Math.round((afterDiscount * gstPercent) / 100)
  const grandTotal = afterDiscount + gstAmount

  const handleSubmit = () => {
    if (items.length === 0) { toast.error('Add at least one bill item'); return }
    if (items.some(it => !it.label.trim())) { toast.error('All bill items need a label'); return }
    onSubmit({ billItems: items, discount, gstPercent, paymentStatus, paymentMethod })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--text-muted)]">
        <p><span className="font-medium text-[var(--text)]">{booking.customerSnapshot.name}</span> — {booking.bookingId}</p>
        <p>{booking.service.serviceName} • {booking.service.problemName}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Bill Items</label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="input-field flex-1 text-sm" placeholder="Item label" value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} />
            <input className="input-field w-16 text-sm" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
            <input className="input-field w-24 text-sm" type="number" placeholder="₹" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} />
            <button onClick={() => removeItem(i)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={addItem} className="text-xs text-primary-500 font-medium flex items-center gap-1"><Plus size={12} /> Add Item</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Discount (₹)</label>
          <input className="input-field" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">GST (%)</label>
          <input className="input-field" type="number" value={gstPercent} onChange={e => setGstPercent(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Payment Status</label>
          <select className="input-field" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Payment Method</label>
          <select className="input-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--bg)] p-3 space-y-1 text-sm">
        <div className="flex justify-between text-[var(--text-muted)]"><span>Subtotal</span><span>₹{subtotal}</span></div>
        {discount > 0 && <div className="flex justify-between text-[var(--text-muted)]"><span>Discount</span><span>-₹{discount}</span></div>}
        {gstPercent > 0 && <div className="flex justify-between text-[var(--text-muted)]"><span>GST ({gstPercent}%)</span><span>₹{gstAmount}</span></div>}
        <div className="flex justify-between font-bold text-[var(--text)] pt-1 border-t border-[var(--border)]"><span>Grand Total</span><span>₹{grandTotal}</span></div>
      </div>

      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? '...' : booking.invoiceNumber ? 'Update Invoice' : 'Generate Invoice'}
      </button>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
          <h2 className="font-display font-bold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const t = useT()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [editing, setEditing] = useState<Booking | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [billRes, bookingsRes] = await Promise.all([
        api.get('/admin/bookings/billing-summary'),
        api.get('/admin/bookings?status=completed&limit=100'),
      ])
      setSummary(billRes.data.summary)
      setBookings(bookingsRes.data.bookings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerateBill = async (data: any) => {
    if (!editing) return
    setSubmitting(true)
    try {
      await api.put(`/admin/bookings/${editing._id}/bill`, data)
      toast.success('Invoice saved')
      setEditing(null)
      fetchData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = bookings.filter(b => {
    const matchesSearch = !search ||
      b.bookingId.toLowerCase().includes(search.toLowerCase()) ||
      b.customerSnapshot.name.toLowerCase().includes(search.toLowerCase())
    const matchesPayment = filterPayment === 'all' || b.paymentStatus === filterPayment ||
      (filterPayment === 'unpaid' && (!b.paymentStatus || b.paymentStatus === 'unpaid'))
    return matchesSearch && matchesPayment
  })

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl text-[var(--text)]">{t('billing')}</h1>
        <p className="text-sm text-[var(--text-muted)]">Generate invoices and track payments</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-[var(--text)] flex items-center gap-1"><IndianRupee size={16} />{summary.totalRevenue}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Paid</p>
            <p className="text-xl font-bold text-green-500 flex items-center gap-1"><IndianRupee size={16} />{summary.paidAmount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{summary.paidCount} bills</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Unpaid</p>
            <p className="text-xl font-bold text-red-500 flex items-center gap-1"><IndianRupee size={16} />{summary.unpaidAmount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{summary.unpaidCount} bills</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Bills</p>
            <p className="text-xl font-bold text-[var(--text)]">{summary.totalBills}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input-field pl-9" placeholder="Search by booking ID or customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'paid', 'unpaid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterPayment(f)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
                filterPayment === f ? 'bg-primary-500 text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border)]'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)]">No completed bookings found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg)] text-[var(--text-muted)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Booking</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th className="px-4 py-3 text-center">Invoice</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(b => (
                  <tr key={b._id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{b.bookingId}</td>
                    <td className="px-4 py-3 text-[var(--text)]">{b.customerSnapshot.name}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{b.service.problemName}</td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text)]">₹{b.grandTotal || b.totalAmount || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        b.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        b.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {b.paymentStatus === 'paid' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {b.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--text-muted)]">{b.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditing(b)} className="text-primary-500 hover:underline text-xs font-medium">
                        {b.invoiceNumber ? 'Edit Bill' : 'Generate Bill'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing.invoiceNumber ? `Invoice ${editing.invoiceNumber}` : 'Generate Invoice'} onClose={() => setEditing(null)}>
          <BillForm booking={editing} onSubmit={handleGenerateBill} loading={submitting} />
        </Modal>
      )}
    </div>
  )
}
