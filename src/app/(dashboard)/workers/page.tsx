'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Select, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal, ShiftBadge } from '@/components/ui'
import type { Worker, WorkerType, Shift } from '@/types/database'

type WorkerFull = Worker & { worker_type: WorkerType; shift: Shift }
const WT_LABELS: Record<string,string> = { WORKER:'عامل', TECHNICIAN:'فني', SUPERVISOR:'مشرف' }
const WAGE_LABELS: Record<string,string> = { daily:'يومي', monthly:'شهري' }

export default function WorkersPage() {
  const { user, role, orgId } = useAuth()
  const supabase = createClient()
  const [workers, setWorkers] = useState<WorkerFull[]>([])
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerFull | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name:'', national_id:'', phone:'', worker_type_id:'', shift_id:'', wage_type:'daily', daily_rate:'', monthly_rate:'', bank_account:'', account_holder_name:'', notes:'', worker_code:'' })

  const canEdit = ['factory_manager','general_manager','super_admin'].includes(role||'')
  const canAdd = ['factory_manager','general_manager','super_admin','gate_1_officer'].includes(role||'')

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [wRes, tRes, sRes] = await Promise.all([
        supabase.from('workers').select('*, worker_type:worker_types(*), shift:shifts(*)').eq('organization_id', orgId).order('full_name'),
        supabase.from('worker_types').select('*').order('name'),
        supabase.from('shifts').select('*').eq('organization_id', orgId).eq('is_active', true),
      ])
      if (wRes.error) throw wRes.error
      setWorkers((wRes.data as any)||[])
      setWorkerTypes(tRes.data||[])
      setShifts(sRes.data||[])
    } catch { setError('حدث خطأ في تحميل بيانات العمال') }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditWorker(null); setFormError(null)
    setForm({ full_name:'', national_id:'', phone:'', worker_type_id:workerTypes[0]?.id||'', shift_id:shifts[0]?.id||'', wage_type:'daily', daily_rate:'', monthly_rate:'', bank_account:'', account_holder_name:'', notes:'', worker_code:'' })
    setShowModal(true)
  }

  function openEdit(w: WorkerFull) {
    setEditWorker(w); setFormError(null)
    setForm({ full_name:w.full_name, national_id:w.national_id, phone:w.phone||'', worker_type_id:w.worker_type_id, shift_id:w.shift_id, wage_type:w.wage_type, daily_rate:String(w.daily_rate), monthly_rate:String(w.monthly_rate), bank_account:w.bank_account||'', account_holder_name:w.account_holder_name||'', notes:w.notes||'', worker_code:w.worker_code })
    setShowModal(true)
  }

  async function save() {
    if (!orgId) return
    setFormError(null)
    if (!form.full_name.trim()) { setFormError('الاسم الكامل مطلوب'); return }
    if (!form.national_id.trim()) { setFormError('الرقم الوطني مطلوب'); return }
    if (!form.worker_type_id) { setFormError('نوع العامل مطلوب'); return }
    if (!form.shift_id) { setFormError('الوردية مطلوبة'); return }
    if (form.bank_account && !form.account_holder_name.trim()) { setFormError('اسم صاحب الحساب مطلوب عند إدخال رقم الحساب'); return }
    setSaving(true)
    try {
      const payload: any = {
        full_name: form.full_name.trim(), national_id: form.national_id.trim(),
        phone: form.phone.trim()||null, worker_type_id: form.worker_type_id,
        shift_id: form.shift_id, wage_type: form.wage_type,
        daily_rate: parseFloat(form.daily_rate)||0, monthly_rate: parseFloat(form.monthly_rate)||0,
        bank_account: form.bank_account.trim()||null, account_holder_name: form.account_holder_name.trim()||null,
        notes: form.notes.trim()||null,
      }
      if (editWorker) {
        const { error: e } = await supabase.from('workers').update(payload).eq('id', editWorker.id)
        if (e) throw e
      } else {
        if (!form.worker_code.trim()) {
          const typeCode = workerTypes.find(t=>t.id===form.worker_type_id)?.code||'W'
          payload.worker_code = `${typeCode}-${Date.now().toString().slice(-5)}`
        } else { payload.worker_code = form.worker_code.trim() }
        payload.organization_id = orgId
        const { error: e } = await supabase.from('workers').insert(payload)
        if (e) {
          if (e.code === '23505') { setFormError('الرقم الوطني أو كود العامل مسجل مسبقاً'); return }
          throw e
        }
      }
      setShowModal(false); load()
    } catch (e: any) { setFormError(e?.message||'حدث خطأ. حاول مجدداً.') }
    finally { setSaving(false) }
  }

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    return (!q || w.full_name.toLowerCase().includes(q) || w.national_id.includes(q) || w.worker_code.toLowerCase().includes(q))
      && (!filterType || w.worker_type_id === filterType)
      && (!filterShift || w.shift_id === filterShift)
  })

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="👷 العمال والفنيون والمشرفون" subtitle={`${workers.length} عامل مسجل`}
        actions={canAdd ? <Button variant="primary" onClick={openAdd}>+ إضافة عامل</Button> : undefined}
      />
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={()=>setError(null)}>✕</button></div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Input placeholder="بحث بالاسم / الرقم الوطني / الكود" value={search} onChange={e=>setSearch(e.target.value)} />
        <Select options={[{value:'',label:'كل الأنواع'},...workerTypes.map(t=>({value:t.id,label:WT_LABELS[t.name]||t.name}))]} value={filterType} onChange={e=>setFilterType(e.target.value)} />
        <Select options={[{value:'',label:'كل الورديات'},...shifts.map(s=>({value:s.id,label:s.name.includes('DAY')?'☀️ نهارية':'🌙 ليلية'}))]} value={filterShift} onChange={e=>setFilterShift(e.target.value)} />
      </div>
      {filtered.length === 0 ? <EmptyState icon="👷" title="لا توجد نتائج" desc="غيّر معايير البحث أو أضف عمالاً جدداً" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-400 text-xs">
                {['الكود','الاسم','الرقم الوطني','النوع','الوردية','نوع الأجر','الأجر اليومي','الحالة','إجراءات'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(w=>(
                  <tr key={w.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-brand-blue-light text-xs">{w.worker_code}</td>
                    <td className="px-4 py-3"><p className="text-white font-medium">{w.full_name}</p>{w.phone&&<p className="text-gray-500 text-xs">{w.phone}</p>}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{w.national_id}</td>
                    <td className="px-4 py-3"><Badge variant="blue">{WT_LABELS[w.worker_type?.name]||w.worker_type?.name}</Badge></td>
                    <td className="px-4 py-3"><ShiftBadge shift={w.shift?.name||''} /></td>
                    <td className="px-4 py-3 text-gray-300">{WAGE_LABELS[w.wage_type]}</td>
                    <td className="px-4 py-3 text-white font-semibold">{w.daily_rate?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={w.status==='ACTIVE'?'green':'red'}>{w.status==='ACTIVE'?'نشط':'موقوف'}</Badge></td>
                    <td className="px-4 py-3">{canEdit&&<Button variant="ghost" size="sm" onClick={()=>openEdit(w)}>تعديل</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editWorker?'تعديل بيانات العامل':'إضافة عامل جديد'}
        footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant="primary" loading={saving} onClick={save}>{editWorker?'حفظ التعديلات':'إضافة العامل'}</Button></>}
      >
        {formError&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{formError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="الاسم الكامل *" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="محمد أحمد علي" />
          <Input label="الرقم الوطني *" value={form.national_id} onChange={e=>setForm(f=>({...f,national_id:e.target.value}))} />
          <Input label="رقم الهاتف" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="اختياري" />
          {!editWorker&&<Input label="كود العامل" value={form.worker_code} onChange={e=>setForm(f=>({...f,worker_code:e.target.value}))} placeholder="يُولَّد تلقائياً" />}
          <Select label="نوع العامل *" value={form.worker_type_id} onChange={e=>setForm(f=>({...f,worker_type_id:e.target.value}))} options={workerTypes.map(t=>({value:t.id,label:WT_LABELS[t.name]||t.name}))} placeholder="اختر النوع" />
          <Select label="الوردية *" value={form.shift_id} onChange={e=>setForm(f=>({...f,shift_id:e.target.value}))} options={shifts.map(s=>({value:s.id,label:s.name.includes('DAY')?'☀️ نهارية':'🌙 ليلية'}))} placeholder="اختر الوردية" />
          <Select label="نوع الأجر" value={form.wage_type} onChange={e=>setForm(f=>({...f,wage_type:e.target.value}))} options={[{value:'daily',label:'يومي'},{value:'monthly',label:'شهري'}]} />
          <Input label="الأجر اليومي" type="number" value={form.daily_rate} onChange={e=>setForm(f=>({...f,daily_rate:e.target.value}))} placeholder="0.00" />
          <Input label="الأجر الشهري" type="number" value={form.monthly_rate} onChange={e=>setForm(f=>({...f,monthly_rate:e.target.value}))} placeholder="0.00" />
          <Input label="رقم الحساب البنكي" value={form.bank_account} onChange={e=>setForm(f=>({...f,bank_account:e.target.value}))} placeholder="اختياري" />
          <Input label="اسم صاحب الحساب" value={form.account_holder_name} onChange={e=>setForm(f=>({...f,account_holder_name:e.target.value}))} placeholder={form.bank_account?'مطلوب':'اختياري'} />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">ملاحظات</label>
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" />
        </div>
      </Modal>
    </div>
  )
}
