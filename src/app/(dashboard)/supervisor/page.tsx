'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient, STORAGE_BUCKETS, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal, Select, ShiftBadge } from '@/components/ui'

const STATUS_LABELS: Record<string,string> = { draft:'مسودة', confirmed:'مؤكد', archived:'مؤرشف' }
const STATUS_COLORS: Record<string,'gray'|'blue'|'green'> = { draft:'gray', confirmed:'blue', archived:'green' }

export default function SupervisorPage() {
  const { user, orgId } = useAuth()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [lines, setLines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [form, setForm] = useState({ shift_id:'', batch_date:new Date().toISOString().split('T')[0], production_line_id:'', total_quantity:'', good_quantity:'', defect_quantity:'', warehouse_quantity:'', notes:'' })

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [bRes, sRes, lRes] = await Promise.all([
        supabase.from('production_batches').select('*, shift:shifts(*), production_line:production_lines(*)').eq('organization_id', orgId).order('batch_date', { ascending:false }).limit(30),
        supabase.from('shifts').select('*').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('production_lines').select('*').eq('organization_id', orgId).eq('is_active', true),
      ])
      setBatches(bRes.data||[]); setShifts(sRes.data||[]); setLines(lRes.data||[])
    } catch { setError('حدث خطأ في تحميل بيانات الإنتاج') }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function submit() {
    if (!orgId || !user) return
    if (!form.shift_id) { setError('الوردية مطلوبة'); return }
    if (!form.total_quantity || parseInt(form.total_quantity) <= 0) { setError('الكمية الإجمالية مطلوبة'); return }
    setSaving(true); setError(null)
    try {
      const imagePaths: string[] = []
      for (const img of images) {
        const path = `${orgId}/${form.batch_date}/${Date.now()}_${img.name}`
        imagePaths.push(await uploadFile(STORAGE_BUCKETS.PRODUCTION_IMAGES, path, img))
      }
      const { error: e } = await supabase.from('production_batches').insert({ organization_id: orgId, supervisor_id: user.id, shift_id: form.shift_id, batch_date: form.batch_date, production_line_id: form.production_line_id || null, total_quantity: parseInt(form.total_quantity)||0, good_quantity: parseInt(form.good_quantity)||0, defect_quantity: parseInt(form.defect_quantity)||0, warehouse_quantity: parseInt(form.warehouse_quantity)||0, status: 'draft' })
      if (e) throw e
      if (imagePaths.length > 0) { await supabase.from('production_reports').insert({ organization_id: orgId, supervisor_id: user.id, report_date: form.batch_date, shift_id: form.shift_id, notes: form.notes || null, images: imagePaths }) }
      setSuccess('تم تسجيل الإنتاج بنجاح ✓'); setShowModal(false); load(); setTimeout(() => setSuccess(null), 3000)
    } catch (e: any) { setError(e?.message||'حدث خطأ. حاول مجدداً.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>
  const today = new Date().toISOString().split('T')[0]
  const todayBatches = batches.filter(b => b.batch_date === today)
  const totalQty = todayBatches.reduce((s,b) => s+b.total_quantity, 0)
  const goodQty = todayBatches.reduce((s,b) => s+b.good_quantity, 0)
  const defectQty = todayBatches.reduce((s,b) => s+b.defect_quantity, 0)

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="🏭 الإنتاج اليومي" subtitle="تسجيل وتتبع بيانات الإنتاج"
        actions={<Button variant="primary" onClick={()=>{setForm({shift_id:shifts[0]?.id||'',batch_date:new Date().toISOString().split('T')[0],production_line_id:'',total_quantity:'',good_quantity:'',defect_quantity:'',warehouse_quantity:'',notes:''});setImages([]);setError(null);setShowModal(true)}}>+ تسجيل إنتاج</Button>}
      />
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {todayBatches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[{label:'إجمالي الإنتاج',value:totalQty,color:'text-white'},{label:'جودة جيدة',value:goodQty,color:'text-green-400'},{label:'تالف',value:defectQty,color:'text-red-400'},{label:'نسبة الجودة',value:totalQty?`${((goodQty/totalQty)*100).toFixed(1)}%`:'—',color:'text-brand-gold-light'}].map(s=>(
            <Card key={s.label} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-gray-400 text-xs mt-1">{s.label}</p></Card>
          ))}
        </div>
      )}
      {batches.length === 0 ? <EmptyState icon="🏭" title="لا توجد سجلات إنتاج" desc="اضغط على تسجيل إنتاج لإضافة أول سجل" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['التاريخ','الوردية','خط الإنتاج','الإجمالي','جيد','تالف','مخزن','الحالة'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{batches.map(b=>(
                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
                  <td className="px-4 py-3 text-white">{new Date(b.batch_date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3"><ShiftBadge shift={b.shift?.name||''} /></td>
                  <td className="px-4 py-3 text-gray-300">{b.production_line?.name||'—'}</td>
                  <td className="px-4 py-3 text-white font-bold">{b.total_quantity?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{b.good_quantity?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-400">{b.defect_quantity?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-brand-blue-light">{b.warehouse_quantity?.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_COLORS[b.status]}>{STATUS_LABELS[b.status]}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title="تسجيل إنتاج جديد"
        footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant="primary" loading={saving} onClick={submit}>حفظ السجل</Button></>}
      >
        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Input label="تاريخ الإنتاج" type="date" value={form.batch_date} onChange={e=>setForm(f=>({...f,batch_date:e.target.value}))} />
          <Select label="الوردية *" value={form.shift_id} onChange={e=>setForm(f=>({...f,shift_id:e.target.value}))} options={shifts.map(s=>({value:s.id,label:s.name.includes('DAY')?'☀️ نهارية':'🌙 ليلية'}))} placeholder="اختر الوردية" />
          <Select label="خط الإنتاج" value={form.production_line_id} onChange={e=>setForm(f=>({...f,production_line_id:e.target.value}))} options={lines.map(l=>({value:l.id,label:l.name}))} placeholder="اختياري" />
          <Input label="الكمية الإجمالية *" type="number" value={form.total_quantity} onChange={e=>setForm(f=>({...f,total_quantity:e.target.value}))} placeholder="0" />
          <Input label="الكمية الجيدة" type="number" value={form.good_quantity} onChange={e=>setForm(f=>({...f,good_quantity:e.target.value}))} placeholder="0" />
          <Input label="الكمية التالفة" type="number" value={form.defect_quantity} onChange={e=>setForm(f=>({...f,defect_quantity:e.target.value}))} placeholder="0" />
          <Input label="المرسل للمخزن" type="number" value={form.warehouse_quantity} onChange={e=>setForm(f=>({...f,warehouse_quantity:e.target.value}))} placeholder="0" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">ملاحظات</label>
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">صور (production-images)</label>
          <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-700 hover:border-brand-blue-light rounded-xl p-4 text-center cursor-pointer transition-colors">
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e=>setImages(Array.from(e.target.files||[]))} />
            {images.length>0 ? <p className="text-green-400 text-sm">{images.length} صورة محددة</p> : <p className="text-gray-500 text-sm">اضغط لإضافة صور</p>}
          </div>
        </div>
      </Modal>
    </div>
  )
}
