'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient, STORAGE_BUCKETS, uploadFile } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal, Select } from '@/components/ui'

export default function WarehousePage() {
  const { user, orgId } = useAuth()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [balances, setBalances] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'stock'|'movements'>('stock')
  const [images, setImages] = useState<File[]>([])
  const [form, setForm] = useState({ product_id:'', movement_type:'INBOUND', quantity:'', shift_id:'', reference:'', notes:'', movement_date:new Date().toISOString().split('T')[0] })

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [bRes, mRes, pRes, sRes] = await Promise.all([
        supabase.from('inventory_balances').select('*, product:products(*)').eq('organization_id', orgId).order('last_updated',{ascending:false}),
        supabase.from('stock_movements').select('*, product:products(*)').eq('organization_id', orgId).order('created_at',{ascending:false}).limit(50),
        supabase.from('products').select('*').eq('organization_id', orgId),
        supabase.from('shifts').select('*').eq('organization_id', orgId).eq('is_active', true),
      ])
      setBalances(bRes.data||[]); setMovements(mRes.data||[])
      setProducts(pRes.data||[]); setShifts(sRes.data||[])
    } catch { setError('حدث خطأ في تحميل بيانات المخزن') }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function submit() {
    if (!orgId||!user) return
    if (!form.product_id) { setError('المنتج مطلوب'); return }
    if (!form.quantity || parseInt(form.quantity) <= 0) { setError('الكمية يجب أن تكون أكبر من صفر'); return }
    setSaving(true); setError(null)
    try {
      const imagePaths: string[] = []
      for (const img of images) {
        const path = `${orgId}/${Date.now()}_${img.name}`
        imagePaths.push(await uploadFile(STORAGE_BUCKETS.WAREHOUSE_IMAGES, path, img))
      }
      const { error: e } = await supabase.from('stock_movements').insert({
        organization_id: orgId, product_id: form.product_id,
        movement_type: form.movement_type as 'INBOUND'|'OUTBOUND',
        quantity: parseInt(form.quantity), shift_id: form.shift_id||null,
        reference: form.reference||null, notes: form.notes||null,
        movement_date: form.movement_date, created_by: user.id,
        images: imagePaths.length > 0 ? imagePaths : null,
      })
      if (e) throw e
      setSuccess(`تم تسجيل ${form.movement_type==='INBOUND'?'الاستلام':'الصرف'} بنجاح ✓`)
      setShowModal(false); load(); setTimeout(() => setSuccess(null), 3000)
    } catch (e:any) { setError(e?.message||'حدث خطأ. حاول مجدداً.') }
    finally { setSaving(false) }
  }

  const totalIn = movements.filter(m=>m.movement_type==='INBOUND').reduce((s,m)=>s+m.quantity,0)
  const totalOut = movements.filter(m=>m.movement_type==='OUTBOUND').reduce((s,m)=>s+m.quantity,0)

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="📦 إدارة المخزن" subtitle="تتبع الرصيد والحركات"
        actions={<div className="flex gap-2"><Button variant="primary" size="sm" onClick={()=>{setForm({product_id:products[0]?.id||'',movement_type:'INBOUND',quantity:'',shift_id:shifts[0]?.id||'',reference:'',notes:'',movement_date:new Date().toISOString().split('T')[0]});setImages([]);setError(null);setShowModal(true)}}>+ استلام</Button><Button variant="danger" size="sm" onClick={()=>{setForm({product_id:products[0]?.id||'',movement_type:'OUTBOUND',quantity:'',shift_id:shifts[0]?.id||'',reference:'',notes:'',movement_date:new Date().toISOString().split('T')[0]});setImages([]);setError(null);setShowModal(true)}}>- صرف</Button></div>}
      />
      {success&&<div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {error&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={()=>setError(null)}>✕</button></div>}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-green-400">{totalIn.toLocaleString()}</p><p className="text-gray-400 text-xs mt-1">إجمالي الاستلام</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-red-400">{totalOut.toLocaleString()}</p><p className="text-gray-400 text-xs mt-1">إجمالي الصرف</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-brand-gold-light">{balances.length}</p><p className="text-gray-400 text-xs mt-1">أصناف في المخزن</p></Card>
      </div>
      <div className="flex gap-2 mb-4">
        {(['stock','movements'] as const).map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===tab?'bg-brand-blue-light text-white':'bg-brand-surface-2 text-gray-400 hover:text-white'}`}>
            {tab==='stock'?'📊 الرصيد الحالي':'📋 سجل الحركات'}
          </button>
        ))}
      </div>
      {activeTab==='stock' ? (
        balances.length===0 ? <EmptyState icon="📦" title="لا توجد أصناف في المخزن" /> : (
          <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['المنتج','الكود','الوحدة','الرصيد الحالي','آخر تحديث'].map(h=><th key={h} className="text-right px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{balances.map(b=>(
            <tr key={b.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{b.product?.name}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{b.product?.code}</td>
              <td className="px-4 py-3 text-gray-400">{b.product?.unit}</td>
              <td className="px-4 py-3"><span className={`text-xl font-bold ${b.current_quantity<=0?'text-red-400':b.current_quantity<50?'text-yellow-400':'text-green-400'}`}>{b.current_quantity?.toLocaleString()}</span></td>
              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.last_updated).toLocaleDateString('ar-EG')}</td>
            </tr>
          ))}</tbody></table></div></Card>
        )
      ) : (
        movements.length===0 ? <EmptyState icon="📋" title="لا توجد حركات مخزنية" /> : (
          <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['التاريخ','المنتج','النوع','الكمية','المرجع','ملاحظات'].map(h=><th key={h} className="text-right px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{movements.map(m=>(
            <tr key={m.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.movement_date).toLocaleDateString('ar-EG')}</td>
              <td className="px-4 py-3 text-white">{m.product?.name}</td>
              <td className="px-4 py-3"><Badge variant={m.movement_type==='INBOUND'?'green':'red'}>{m.movement_type==='INBOUND'?'↓ استلام':'↑ صرف'}</Badge></td>
              <td className="px-4 py-3 font-bold text-white">{m.quantity?.toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{m.reference||'—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{m.notes||'—'}</td>
            </tr>
          ))}</tbody></table></div></Card>
        )
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={form.movement_type==='INBOUND'?'+ استلام بضاعة':'- صرف بضاعة'}
        footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant={form.movement_type==='INBOUND'?'primary':'danger'} loading={saving} onClick={submit}>تسجيل</Button></>}
      >
        {error&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Select label="المنتج *" value={form.product_id} onChange={e=>setForm(f=>({...f,product_id:e.target.value}))} options={products.map(p=>({value:p.id,label:`${p.name} (${p.unit})`}))} placeholder="اختر المنتج" />
          <Input label="الكمية *" type="number" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="0" />
          <Select label="الوردية" value={form.shift_id} onChange={e=>setForm(f=>({...f,shift_id:e.target.value}))} options={shifts.map(s=>({value:s.id,label:s.name.includes('DAY')?'☀️ نهارية':'🌙 ليلية'}))} placeholder="اختياري" />
          <Input label="التاريخ" type="date" value={form.movement_date} onChange={e=>setForm(f=>({...f,movement_date:e.target.value}))} />
          <Input label="المرجع" value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="رقم أو كود مرجعي" />
        </div>
        <div className="mt-4"><label className="block text-sm font-medium text-gray-300 mb-1.5">ملاحظات</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" /></div>
        <div className="mt-4"><label className="block text-sm font-medium text-gray-300 mb-1.5">صور (warehouse-images)</label><div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-gray-700 hover:border-brand-blue-light rounded-xl p-4 text-center cursor-pointer transition-colors"><input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e=>setImages(Array.from(e.target.files||[]))} />{images.length>0 ? <p className="text-green-400 text-sm">{images.length} صورة محددة</p> : <p className="text-gray-500 text-sm">اضغط لإضافة صور</p>}</div></div>
      </Modal>
    </div>
  )
}
