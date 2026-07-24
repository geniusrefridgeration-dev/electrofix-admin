import { X, Printer } from 'lucide-react'
// Admin uses inline Booking type
interface BookingForInvoice { _id: string; bookingId: string; status: string; customerSnapshot?: any; service?: any; homeVisitCharge?: number; [key: string]: any }

const PHONE   = (import.meta.env.VITE_SHOP_PHONE   as string) || '+919876543210'
const SITE    = (import.meta.env.VITE_SITE_URL     as string) || 'https://electrofix.in'

interface Props {
  booking: BookingForInvoice
  onClose: () => void
}

function InvoiceView({ booking }: { booking: BookingForInvoice }) {
  const b   = booking as any
  const now = new Date(b.billGeneratedAt || b.completedAt || b.createdAt)
  const items: { label: string; amount: number; quantity: number }[] = b.billItems || []
  const subtotal     = items.reduce((s, i) => s + i.amount * (i.quantity || 1), 0)
  const discount     = b.discount     || 0
  const gstAmount    = b.gstAmount    || 0
  const gstPercent   = b.gstPercent   || 0
  const grandTotal   = b.grandTotal   || b.totalAmount || 0
  const afterDiscount = Math.max(0, subtotal - discount)

  const payColor = b.paymentStatus === 'paid' ? '#16a34a' : b.paymentStatus === 'partial' ? '#d97706' : '#dc2626'
  const payLabel = b.paymentStatus === 'paid' ? '✅ PAID' : b.paymentStatus === 'partial' ? '⚡ PARTIAL' : '❌ UNPAID'

  return (
    <div id="invoice-print-area" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 580, margin: '0 auto', background: '#fff', color: '#111' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', padding: '28px 32px', borderRadius: '12px 12px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>ElectroFix</h1>
            <p style={{ color: '#93c5fd', fontSize: 13, margin: '2px 0 0' }}>Genius Refrigeration</p>
            <p style={{ color: '#bfdbfe', fontSize: 12, marginTop: 8 }}>📞 {PHONE}</p>
            <p style={{ color: '#bfdbfe', fontSize: 12 }}>🌐 {SITE}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', marginBottom: 8 }}>
              <p style={{ color: '#93c5fd', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Invoice No.</p>
              <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>{b.invoiceNumber || `#${booking.bookingId}`}</p>
            </div>
            <p style={{ color: '#bfdbfe', fontSize: 12 }}>Date: {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Customer + Status */}
      <div style={{ background: '#f8fafc', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Bill To</p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 2px', color: '#0f172a' }}>{booking.customerSnapshot?.name || '—'}</p>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>📞 {booking.customerSnapshot?.mobile}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
            {booking.customerSnapshot?.address?.fullAddress || [booking.customerSnapshot?.address?.street, booking.customerSnapshot?.address?.city].filter(Boolean).join(', ')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Booking</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', margin: '4px 0 2px' }}>#{booking.bookingId}</p>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>{booking.service?.serviceName}</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{booking.service?.problemName}</p>
        </div>
      </div>

      {/* Technician info if dispatched */}
      {b.employeeSnapshot && (
        <div style={{ padding: '12px 32px', background: '#eff6ff', borderTop: '1px solid #dbeafe' }}>
          <p style={{ fontSize: 11, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
            🔧 Technician: <strong>{b.employeeSnapshot.name}</strong> · {b.employeeSnapshot.designation} · {b.employeeSnapshot.mobile} · {b.employeeSnapshot.employeeIdCode}
          </p>
        </div>
      )}

      {/* Bill Items Table */}
      <div style={{ padding: '24px 32px 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Description</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: 14, color: '#1e293b' }}>{item.label}</td>
                <td style={{ padding: '12px', fontSize: 14, color: '#475569', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '12px', fontSize: 14, color: '#475569', textAlign: 'right' }}>₹{item.amount}</td>
                <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>₹{item.amount * (item.quantity || 1)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '12px', fontSize: 14, color: '#475569', textAlign: 'center' }}>
                  Home Visit Charge + Repair
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '0 32px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569' }}>
            <span>Subtotal</span><span>₹{subtotal}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#16a34a' }}>
              <span>Discount</span><span>-₹{discount}</span>
            </div>
          )}
          {gstPercent > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#475569' }}>
              <span>GST ({gstPercent}%)</span><span>₹{gstAmount}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 16, fontWeight: 800, background: '#1e3a5f', color: '#fff', borderRadius: 8, marginTop: 8 }}>
            <span>Grand Total</span><span>₹{grandTotal}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div style={{ padding: '16px 32px', background: '#f8fafc', borderTop: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: payColor }}>{payLabel}</span>
          {b.paymentMethod && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>via {b.paymentMethod.toUpperCase()}</span>}
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Thank you for choosing ElectroFix 🙏</span>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 32px', borderRadius: '0 0 12px 12px', background: '#0f172a', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
          This is a computer-generated invoice. For queries call {PHONE}
        </p>
      </div>
    </div>
  )
}

export default function InvoiceModal({ booking, onClose }: Props) {
  const handlePrint = () => {
    const content = document.getElementById('invoice-print-area')
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Invoice ${(booking as any).invoiceNumber || booking.bookingId}</title>
      <style>
        body { margin: 0; padding: 20px; background: #fff; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Invoice {(booking as any).invoiceNumber || `#${booking.bookingId}`}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors">
              <Printer size={15} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Invoice content */}
        <div className="overflow-y-auto flex-1 p-4">
          <InvoiceView booking={booking} />
        </div>
      </div>
    </div>
  )
}
