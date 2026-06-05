import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, Tag, AlertCircle, IndianRupee, FolderOpen, ListChecks } from 'lucide-react'
import { useT, useAppStore } from '@/store/appStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Problem { _id: string; name: string; nameHindi?: string; nameHinglish?: string; price?: number; isPriceFixed: boolean; isActive: boolean }
interface Category { _id: string; name: string; image?: string; isActive: boolean; problems: Problem[] }
interface Service {
  _id: string; name: string; image?: string; hasCategories: boolean;
  isActive: boolean; categories: Category[]; problems: Problem[]
}

// Simple Modal
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-display font-bold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)]">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// Problem Form Component
// ── MyMemory translate helper (client-side, free, no key) ────────────────────
async function myMemoryTranslate(text: string, from: string, to: string): Promise<string> {
  if (!text.trim() || from === to) return text
  try {
    const params = new URLSearchParams({ q: text, langpair: `${from}|${to}` })
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`)
    if (!res.ok) return text
    const data = await res.json()
    return data?.responseData?.translatedText || text
  } catch { return text }
}

// Detect Devanagari (Hindi script)
function isHindi(text: string) { return /[\u0900-\u097F]/.test(text) }

// Get localized name based on admin's selected language
function getLocalizedName(item: { name: string; nameHindi?: string; nameHinglish?: string }, lang: string): string {
  if (lang === 'hindi')    return item.nameHindi    || item.name
  if (lang === 'hinglish') return item.nameHinglish || item.name
  return item.name
}

// ── Skip translation for abbreviations/brands ────────────────────────────────
function shouldSkipTranslation(text: string): boolean {
  const t = text.trim()
  if (/^[A-Z0-9\s\-\.]+$/.test(t)) return true  // All caps = abbreviation (RO, AC, TV)
  if (t.length <= 2) return true                   // Very short
  if (/\d/.test(t)) return true                    // Contains digits = model number
  return false
}

// ── Translate text via MyMemory ───────────────────────────────────────────────
async function buildAllTranslations(text: string): Promise<{ en: string; hi: string; hl: string }> {
  if (!text.trim()) return { en: text, hi: text, hl: text }
  // Don't translate abbreviations or brand names
  if (shouldSkipTranslation(text)) return { en: text, hi: text, hl: text }
  if (isHindi(text)) {
    const en = await myMemoryTranslate(text, 'hi', 'en')
    return { en, hi: text, hl: en }
  } else {
    const hi = await myMemoryTranslate(text, 'en', 'hi')
    return { en: text, hi, hl: text }
  }
}

// ── ProblemForm with auto-translate ─────────────────────────────────────────
function ProblemForm({ onSubmit, initial, loading }: {
  onSubmit: (d: any) => void
  initial?: Partial<Problem>
  loading: boolean
}) {
  const [name,         setName]         = useState(initial?.name || '')
  const [price,        setPrice]        = useState(initial?.price !== undefined ? String(initial.price) : '')
  const [isPriceFixed, setIsPriceFixed] = useState(initial?.isPriceFixed || false)
  const [translating,  setTranslating]  = useState(false)
  const [preview,      setPreview]      = useState<{ en: string; hi: string; hl: string } | null>(null)
  const t        = useT()
  const language = useAppStore((s) => s.language)

  // Show preview after typing stops (on blur)
  const handleBlur = async () => {
    if (!name.trim() || translating || preview) return
    setTranslating(true)
    const result = await buildAllTranslations(name)
    setTranslating(false)
    setPreview(result)
  }

  // Save — always translate first, then submit
  const handleSubmit = async () => {
    if (!name.trim() || translating) return
    setTranslating(true)
    const result = preview ?? await buildAllTranslations(name)
    setTranslating(false)
    onSubmit({
      name:         result.en,
      nameHindi:    result.hi,
      nameHinglish: result.hl,
      price:        price ? Number(price) : null,
      isPriceFixed,
    })
  }



  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
          {t('problemName')} *
        </label>
        <div className="relative">
          <input
            className="input-field pr-10"
            value={name}
            onChange={e => { setName(e.target.value); setPreview(null) }}
            onBlur={handleBlur}
            placeholder={
              language === 'hindi'
                ? 'जैसे: मशीन नहीं चल रही'
                : language === 'hinglish'
                ? 'e.g. Machine nahi chal rahi'
                : 'e.g. Machine not working'
            }
          />
          {translating && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Translation preview — shows both translations */}
        {preview && (
          <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Will be saved as:</p>
              <button type="button" onClick={() => setPreview(null)}
                className="text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 w-16 flex-shrink-0">English</span>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{preview.en}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 w-16 flex-shrink-0">Hindi</span>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{preview.hi}</span>
            </div>
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          💡 Kisi bhi language mein type karo — teeno languages mein auto-save hoga
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{t('priceOptional')}</label>
        <div className="relative">
          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input-field pl-8" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Leave empty if not fixed" />
        </div>
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" checked={isPriceFixed} onChange={e => setIsPriceFixed(e.target.checked)} className="accent-primary-500" />
          <span className="text-sm text-[var(--text-muted)]">{t('fixedPrice')}</span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || translating || !name}
        className="btn-primary w-full justify-center"
      >
        {translating ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            Translating...
          </span>
        ) : loading ? '...' : t('save')}
      </button>
    </div>
  )
}


export default function ServicesPage() {
  const t = useT()
  const language = useAppStore((s) => s.language)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: string; serviceId?: string; catId?: string; initial?: any } | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; serviceId?: string; catId?: string } | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/admin/services')
      setServices(res.data.services)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  const openModal = (type: string, serviceId?: string, catId?: string, initial?: any) => {
    setModal({ type, serviceId, catId, initial })
    setForm(initial || {})
  }

  const handleSave = async () => {
    if (!modal) return
    setSaving(true)
    try {
      const { type, serviceId, catId } = modal
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)) })
      if (form._file) fd.set('image', form._file)

      if (type === 'addService')       await api.post('/admin/services', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (type === 'editService')      await api.put(`/admin/services/${serviceId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (type === 'addCategory')      await api.post(`/admin/services/${serviceId}/categories`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (type === 'editCategory')     await api.put(`/admin/services/${serviceId}/categories/${catId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      toast.success('Saved successfully')
      setModal(null)
      fetchServices()
    } finally { setSaving(false) }
  }

  const handleProblemSave = async (data: any) => {
    if (!modal) return
    setSaving(true)
    try {
      const { type, serviceId, catId, initial } = modal
      if (type === 'addProblemCat')    await api.post(`/admin/services/${serviceId}/categories/${catId}/problems`, data)
      if (type === 'editProblemCat')   await api.put(`/admin/services/${serviceId}/categories/${catId}/problems/${initial._id}`, data)
      if (type === 'addProblemDirect') await api.post(`/admin/services/${serviceId}/problems`, data)
      if (type === 'editProblemDirect')await api.put(`/admin/services/${serviceId}/problems/${initial._id}`, data)
      toast.success('Saved successfully')
      setModal(null)
      fetchServices()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      const { type, id, serviceId, catId } = deleteConfirm
      if (type === 'service')      await api.delete(`/admin/services/${id}`)
      if (type === 'category')     await api.delete(`/admin/services/${serviceId}/categories/${id}`)
      if (type === 'problemCat')   await api.delete(`/admin/services/${serviceId}/categories/${catId}/problems/${id}`)
      if (type === 'problemDirect')await api.delete(`/admin/services/${serviceId}/problems/${id}`)
      toast.success('Deleted')
      setDeleteConfirm(null)
      fetchServices()
    } finally { setSaving(false) }
  }

  const isProblemModal = modal?.type.toLowerCase().includes('problem')

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)]">{t('services')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{services.length} services configured</p>
        </div>
        <button onClick={() => openModal('addService')} className="btn-primary">
          <Plus size={16} /> {t('addService')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : services.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-[var(--text-muted)]">
          <Wrench size={40} className="mb-3 opacity-30" />
          <p>No services yet. Add your first service!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc._id} className="card overflow-hidden">
              {/* Service Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--bg)] transition-colors"
                onClick={() => setExpandedService(expandedService === svc._id ? null : svc._id)}
              >
                <div className="flex items-center gap-3">
                  {svc.image
                    ? <img src={svc.image} alt={svc.name} className="w-10 h-10 rounded-lg object-cover" />
                    : <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                        <Wrench size={18} className="text-primary-500" />
                      </div>
                  }
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--text)]">{svc.name}</p>
                      <span className={`badge ${svc.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {svc.isActive ? t('active') : t('inactive')}
                      </span>
                      {!svc.hasCategories && (
                        <span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Direct Problems</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {svc.hasCategories ? `${svc.categories.length} categories` : `${svc.problems.length} problems`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); openModal('editService', svc._id, undefined, { name: svc.name, hasCategories: svc.hasCategories, isActive: svc.isActive }) }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'service', id: svc._id }) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className={clsx('text-[var(--text-muted)] transition-transform ml-1', expandedService === svc._id && 'rotate-90')} />
                </div>
              </div>

              {/* Expanded Service Content */}
              {expandedService === svc._id && (
                <div className="border-t border-[var(--border)] animate-slide-in">
                  {svc.hasCategories ? (
                    /* WITH CATEGORIES */
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                          <FolderOpen size={14} /> Categories
                        </p>
                        <button onClick={() => openModal('addCategory', svc._id)} className="btn-secondary py-1.5 px-3 text-xs">
                          <Plus size={13} /> {t('addCategory')}
                        </button>
                      </div>

                      {svc.categories.map((cat) => (
                        <div key={cat._id} className="border border-[var(--border)] rounded-xl overflow-hidden">
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-[var(--bg)] cursor-pointer"
                            onClick={() => setExpandedCategory(expandedCategory === cat._id ? null : cat._id)}
                          >
                            <div className="flex items-center gap-2">
                              <Tag size={14} className="text-primary-500" />
                              <span className="font-medium text-sm text-[var(--text)]">{cat.name}</span>
                              <span className={`badge ${cat.isActive ? 'badge-active' : 'badge-inactive'} text-[10px]`}>
                                {cat.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">({cat.problems.length} problems)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={e => { e.stopPropagation(); openModal('editCategory', svc._id, cat._id, { name: cat.name, isActive: cat.isActive }) }}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Pencil size={12} /></button>
                              <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'category', id: cat._id, serviceId: svc._id }) }}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={12} /></button>
                              <ChevronRight size={14} className={clsx('text-[var(--text-muted)] transition-transform', expandedCategory === cat._id && 'rotate-90')} />
                            </div>
                          </div>

                          {expandedCategory === cat._id && (
                            <div className="p-3 space-y-2 border-t border-[var(--border)]">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1"><ListChecks size={12} /> Problems</p>
                                <button onClick={() => openModal('addProblemCat', svc._id, cat._id)} className="btn-secondary py-1 px-2.5 text-xs">
                                  <Plus size={11} /> Add
                                </button>
                              </div>
                              {cat.problems.length === 0 ? (
                                <p className="text-xs text-center py-4 text-[var(--text-muted)]">No problems added yet</p>
                              ) : cat.problems.map((prob) => (
                                <div key={prob._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)]">
                                  <div>
                                    <p className="text-sm text-[var(--text)]">{getLocalizedName(prob, language)}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {prob.isPriceFixed && prob.price ? `₹${prob.price}` : 'Price after inspection'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => openModal('editProblemCat', svc._id, cat._id, prob)}
                                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Pencil size={12} /></button>
                                    <button onClick={() => setDeleteConfirm({ type: 'problemCat', id: prob._id, serviceId: svc._id, catId: cat._id })}
                                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {svc.categories.length === 0 && (
                        <p className="text-sm text-center py-4 text-[var(--text-muted)]">No categories yet. Add one!</p>
                      )}
                    </div>
                  ) : (
                    /* WITHOUT CATEGORIES - Direct Problems */
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1"><ListChecks size={12} /> Problems</p>
                        <button onClick={() => openModal('addProblemDirect', svc._id)} className="btn-secondary py-1.5 px-3 text-xs">
                          <Plus size={13} /> Add Problem
                        </button>
                      </div>
                      {svc.problems.map((prob) => (
                        <div key={prob._id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--bg)]">
                          <div>
                            <p className="text-sm text-[var(--text)]">{getLocalizedName(prob, language)}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {prob.isPriceFixed && prob.price ? `₹${prob.price}` : 'Price after inspection'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openModal('editProblemDirect', svc._id, undefined, prob)}
                              className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Pencil size={12} /></button>
                            <button onClick={() => setDeleteConfirm({ type: 'problemDirect', id: prob._id, serviceId: svc._id })}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                      {svc.problems.length === 0 && <p className="text-sm text-center py-4 text-[var(--text-muted)]">No problems yet</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {modal && !isProblemModal && (
        <Modal
          title={modal.type.startsWith('add') ? (modal.type === 'addService' ? t('addService') : t('addCategory')) : (modal.type === 'editService' ? t('editService') : t('editCategory'))}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{t('name')} *</label>
              <input className="input-field" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            {(modal.type === 'addService' || modal.type === 'editService') && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{t('description')}</label>
                  <textarea className="input-field resize-none" rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.hasCategories !== false} onChange={e => setForm({...form, hasCategories: e.target.checked})} className="accent-primary-500" />
                  <span className="text-sm text-[var(--text)]">Has Categories (uncheck for direct problems like RO)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive !== false} onChange={e => setForm({...form, isActive: e.target.checked})} className="accent-primary-500" />
                  <span className="text-sm text-[var(--text)]">Active</span>
                </label>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{t('image')}</label>
              <input type="file" accept="image/*" className="input-field text-sm"
                onChange={e => setForm({...form, _file: e.target.files?.[0]})} />
            </div>

            <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary w-full justify-center">
              {saving ? '...' : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {/* PROBLEM MODAL */}
      {modal && isProblemModal && (
        <Modal
          title={modal.type.startsWith('add') ? t('addProblem') : t('editProblem')}
          onClose={() => setModal(null)}
        >
          <ProblemForm onSubmit={handleProblemSave} initial={modal.initial} loading={saving} />
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <h2 className="font-display font-bold text-center text-[var(--text)] mb-2">Confirm Delete</h2>
            <p className="text-sm text-center text-[var(--text-muted)] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              <button onClick={handleDelete} disabled={saving} className="btn-danger flex-1 justify-center">{saving ? '...' : t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Wrench({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
