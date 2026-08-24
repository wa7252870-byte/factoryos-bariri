'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Button, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '@/components/ui'
import type { Organization, SubscriptionPlan } from '@/types/database'

const STATUS_L: Record<string,string> = { active:'نشط', inactive:'غير نشط', suspended:'موقوف', trial:'تجريبي' }
const STATUS_C: Record<string,any> = { active:'green', inactive:'gray', suspended:'red', trial:'yellow' }

export default function FactoriesPage() {
  const supabase = createClient()
  const [orgs, setOrgs] = useState<any[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editOrg, setEditOrg] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name:'', code:'', status:'active', manager_name:'', email:'', phone:'', address:'', currency:'SAR', timezone:'Asia/Riyadh', activity_type:'', plan_id:'' })

  const load = useCallback(async () => {
    try {
      const [orgsRes, plansRes, subsRes] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at',{ascending:false}),
        supabase.from('subscription_plans').select('*').eq('is_active',true).order('price'),
        supabase.from('subscriptions').select('*, plan:subscription_plans(name, price)').eq('status','active'),
      ])
      const subs = (subsRes.data||[])
      setOrgs((orgsRes.data||[]).map(org => ({...org, subscription: subs.find((s:any)=>s.organization_id===org.id)||null})))
      setPlans(plansRes.data||[])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.name.trim()||!form.code.trim()) { setError('الاسم والكود مطلوبان'); return }
    setSaving(true); setError(null)
    try {
      const payload: any = { name:form.name.trim(), code:form.code.trim(), status:form.status as any, manager_name:form.manager_name||null, email:form.email||null, phone:form.phone||null, address:form.address||null, currency:form.currency, timezone:form.timezone, activity_type:form.activity_type||null }
      if (editOrg) { await supabase.from('organizations').update(payload).eq('id', editOrg.id) }
      else {
        const { data: newOrg, error: e } = await supabase.from('organizations').insert(payload).select().single()
        if (e) throw e
        if (form.plan_id && newOrg) { await supabase.from('subscriptions').insert({ organization_id: newOrg.id, plan_id: form.plan_id, status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now()+365*86400000).toISOString().split('T')[0] }) }
      }
      setShowModal(false); load()
    } catch (e:any) { setError(e?.message||'حدث خطأ') }
    finally { setSaving(false) }
  }

  const filtered = orgs.filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase()))
  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="🏭 إدارة المصانع" subtitle={`${orgs.length} مصنع مسجل`} actions={<Button variant="primary" onClick={()=>{setEditOrg(null);setError(null);setForm({name:'',code:'',status:'active',manager_name:'',email:'',phone:'',address:'',currency:'SAR',timezone:'Asia/Riyadh',activity_type:'',plan_id:plans[0]?.id||''});setShowModal(true)}}>+ إضافة مصنع</Button>} />
      <div className="mb-4"><Input placeholder="بحث بالاسم أو الكود..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
      {filtered.length===0 ? <EmptyState icon="🏭" title="لا توجد مصانع" /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['المصنع','الكود','المدير','الهاتف','الخطة','الحالة','إجراءات'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(org=>(
            <tr key={org.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
              <td className="px-4 py-3"><p className="text-white font-medium">{org.name}</p><p className="text-gray-500 text-xs">{org.activity_type||'—'}</p></td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{org.code}</td>
              <td className="px-4 py-3 text-gray-300">{org.manager_name||'—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{org.phone||'—'}</td>
              <td className="px-4 py-3">{org.subscription ? <Badge variant="blue">{org.subscription.plan?.name}</Badge> : <Badge variant="gray">بدون خطة</Badge>}</td>
              <td className="px-4 py-3"><Badge variant={STATUS_C[org.status]}>{STATUS_L[org.status]}</Badge></td>
              <td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>{setEditOrg(org);setError(null);setForm({name:org.name,code:org.code,status:org.status,manager_name:org.manager_name||'',email:org.email||'',phone:org.phone||'',address:org.address||'',currency:org.currency,timezone:org.timezone,activity_type:org.activity_type||'',plan_id:org.subscription?.plan_id||''});setShowModal(true)}}>تعديل</Button><Button variant={org.status==='active'?'danger':'secondary'} size="sm" onClick={async()=>{await supabase.from('organizations').update({status:org.status==='active'?'suspended':'active'}).eq('id',org.id);load()}}>{org.status==='active'?'إيقاف':'تفعيل'}</Button></div></td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editOrg?'تعديل مصنع':'إضافة مصنع جديد'} footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant="primary" loading={saving} onClick={save}>{editOrg?'حفظ':'إضافة'}</Button></>}>
        {error&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="اسم المصنع *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Input label="الكود *" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} />
          <Input label="اسم المدير" value={form.manager_name} onChange={e=>setForm(f=>({...f,manager_name:e.target.value}))} />
          <Input label="البريد الإلكتروني" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          <Input label="الهاتف" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
          <Input label="نشاط المصنع" value={form.activity_type} onChange={e=>setForm(f=>({...f,activity_type:e.target.value}))} />
          <Input label="العملة" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} placeholder="SAR" />
          <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light">{Object.entries(STATUS_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
          {!editOrg && plans.length>0 && <select value={form.plan_id} onChange={e=>setForm(f=>({...f,plan_id:e.target.value}))} className="col-span-2 bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light"><option value="">بدون خطة</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {p.price} {p.currency}/سنة</option>)}</select>}
        </div>
        <div className="mt-3"><Input label="العنوان" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
      </Modal>
    </div>
  )
}
