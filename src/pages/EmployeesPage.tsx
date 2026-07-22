import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, UserCog, Power, Camera, X, Star, CheckCircle2, Briefcase } from 'lucide-react'
import { useT } from '@/store/appStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Employee {
  _id: string
  name: string
  mobile: string
  email?: string
  designation: string
  specialization: string[]
  profileImage?: string
  employeeIdCode: string
  isActive: boolean
  totalAssigned: number
  totalCompleted: number
  avgRating: number
  address?: { street?: string; city?: string; state?: string; pincode?: string; fullAddress?: string }
  notes?: string
}

const SPECIALIZATIONS = ['AC', 'Refrigerator', 'Washing Machine', 'RO', 'Geyser', 'Microwave', 'General Electrician']

// Simple Modal — same pattern as ServicesPage
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

function EmployeeForm({ initial, onSubmit, loading }: {
  initial?: Partial<Employee>
  onSubmit: (data: any) => void
  loading: boolean
}) {
  const [name, setName] = useState(initial?.name || '')
  const [mobile, setMobile] = useState(initial?.mobile || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [designation, setDesignation] = useState(initial?.designation || 'Technician')
  const [specialization, setSpecialization] = useState<string[]>(initial?.specialization || [])
  const [street, setStreet] = useState(initial?.address?.street || '')
  const [city, setCity] = useState(initial?.address?.city || '')
  const [state, setState] = useState(initial?.address?.state || '')
  const [pincode, setPincode] = useState(initial?.address?.pincode || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  const toggleSpec = (s: string) => {
    setSpecialization(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!/^\d{10}$/.test(mobile)) { toast.error('Valid 10-digit mobile required'); return }
    onSubmit({
      name: name.trim(), mobile, email: email || undefined, designation,
      specialization,
      address: { street, city, state, pincode, fullAddress: [street, city, state, pincode].filter(Boolean).join(', ') },
      notes: notes || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Full Name *</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Mobile *</label>
          <input className="input-field" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Email</label>
          <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Designation</label>
          <select className="input-field" value={designation} onChange={e => setDesignation(e.target.value)}>
            <option>Technician</option>
            <option>Senior Technician</option>
            <option>Electrician</option>
            <option>Supervisor</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Specialization</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpec(s)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                specialization.includes(s)
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-primary-300'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Address</label>
        <input className="input-field mb-2" value={street} onChange={e => setStreet(e.target.value)} placeholder="Street / Area" />
        <div className="grid grid-cols-3 gap-2">
          <input className="input-field" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
          <input className="input-field" value={state} onChange={e => setState(e.target.value)} placeholder="State" />
          <input className="input-field" value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Pincode" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Internal Notes (Optional)</label>
        <textarea className="input-field resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for office use..." />
      </div>

      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? '...' : initial?._id ? 'Update Employee' : 'Add Employee'}
      </button>
    </div>
  )
}

export default function EmployeesPage() {
  const t = useT()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter === 'all' ? '' : `?active=${filter === 'active'}`
      const res = await api.get(`/admin/employees${params}`)
      setEmployees(res.data.employees)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const handleSubmit = async (data: any) => {
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/admin/employees/${editing._id}`, data)
        toast.success('Employee updated')
      } else {
        await api.post('/admin/employees', data)
        toast.success('Employee added')
      }
      setShowForm(false)
      setEditing(null)
      fetchEmployees()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save employee')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (emp: Employee) => {
    try {
      await api.put(`/admin/employees/${emp._id}/toggle-active`)
      toast.success(emp.isActive ? 'Employee deactivated' : 'Employee activated')
      fetchEmployees()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/employees/${emp._id}`)
      toast.success('Employee deleted')
      fetchEmployees()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete')
    }
  }

  const openProfile = async (emp: Employee) => {
    setSelected(emp)
    try {
      const res = await api.get(`/admin/employees/${emp._id}`)
      setRecentBookings(res.data.recentBookings || [])
    } catch {
      setRecentBookings([])
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId) return
    const fd = new FormData()
    fd.append('image', file)
    try {
      await api.post(`/admin/employees/${uploadTargetId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Photo updated')
      fetchEmployees()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text)]">{t('employees')}</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage technicians and electricians</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['active', 'inactive', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
              filter === f ? 'bg-primary-500 text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border)]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Hidden file input for image upload */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Employee Grid */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="card p-12 text-center">
          <UserCog size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)]">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp._id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                    {emp.profileImage ? (
                      <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">{emp.name.charAt(0)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setUploadTargetId(emp._id); fileInputRef.current?.click() }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow"
                  >
                    <Camera size={11} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openProfile(emp)} className="font-semibold text-[var(--text)] hover:text-primary-500 transition-colors text-left">
                    {emp.name}
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">{emp.designation} • {emp.employeeIdCode}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={clsx('w-1.5 h-1.5 rounded-full', emp.isActive ? 'bg-green-500' : 'bg-gray-400')} />
                    <span className="text-xs text-[var(--text-muted)]">{emp.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Phone size={12} /> {emp.mobile}
              </div>

              {emp.specialization?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {emp.specialization.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)]">{s}</span>
                  ))}
                  {emp.specialization.length > 3 && <span className="text-[10px] text-[var(--text-muted)]">+{emp.specialization.length - 3}</span>}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                <span className="flex items-center gap-1"><Briefcase size={11} /> {emp.totalAssigned} assigned</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} /> {emp.totalCompleted} done</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditing(emp); setShowForm(true) }} className="btn-secondary flex-1 text-xs py-1.5">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(emp)} className="btn-secondary flex-1 text-xs py-1.5">
                  <Power size={12} /> {emp.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(emp)} className="px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Employee' : 'Add Employee'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <EmployeeForm initial={editing || undefined} onSubmit={handleSubmit} loading={submitting} />
        </Modal>
      )}

      {/* Employee Profile Modal */}
      {selected && (
        <Modal title="Employee Profile" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {selected.profileImage ? (
                  <img src={selected.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-xl">{selected.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="font-display font-bold text-[var(--text)]">{selected.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{selected.designation} • {selected.employeeIdCode}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="card p-3">
                <p className="text-lg font-bold text-[var(--text)]">{selected.totalAssigned}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Assigned</p>
              </div>
              <div className="card p-3">
                <p className="text-lg font-bold text-[var(--text)]">{selected.totalCompleted}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Completed</p>
              </div>
              <div className="card p-3">
                <p className="text-lg font-bold text-[var(--text)] flex items-center justify-center gap-1">
                  <Star size={14} className="text-yellow-500" /> {selected.avgRating?.toFixed(1) || '—'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">Avg Rating</p>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2 text-[var(--text)]"><Phone size={14} className="text-[var(--text-muted)]" /> {selected.mobile}</p>
              {selected.email && <p className="flex items-center gap-2 text-[var(--text)]"><Mail size={14} className="text-[var(--text-muted)]" /> {selected.email}</p>}
              {selected.address?.fullAddress && <p className="flex items-center gap-2 text-[var(--text)]"><MapPin size={14} className="text-[var(--text-muted)]" /> {selected.address.fullAddress}</p>}
            </div>

            {recentBookings.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Recent Bookings</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentBookings.map((b: any) => (
                    <div key={b._id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--bg)]">
                      <span className="text-[var(--text)]">{b.bookingId} — {b.service?.problemName}</span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium',
                        b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
