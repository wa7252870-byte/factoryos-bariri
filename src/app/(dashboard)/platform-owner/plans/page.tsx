'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Button, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '@/components/ui'
import type { SubscriptionPlan } from '@/types/database'

export default function PlansPage() {
  const supabase = createClient()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name:'', price:'', currency:'SAR', max_users:'10', max_workers:'100', trial_days:'14', is_active:true, f1:'', f2:'', f3:'', f4:'', f5:'' })

  const load = useCallback(async () => { const { data } = await supabase.from('subscription_plans').select('*').order('price'); setPlans(data||[]); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.name.trim()||!form.price) { setError('الاسم والسعر مطلوبان'); return }
    setSaving(true); setError(null)
    const features = [form.f1,form.f2,form.f3,form.f4,form.f5].filter(Boolean)
    const payload: any = { name:form.name.trim(), price:parseFloat(form.price), currency:form.currency, max_users:parseInt(form.max_users)||10, max_workers:parseInt(form.max_workers)||100, trial_days:parseInt(form.trial_days)||0, is_active:form.is_active, features }
    try {
      if (editPlan) { await supabase.from('subscription_plans').update(payload).eq('id', editPlan.id) }
      else { await supabase.from('subscription_plans').insert(payload) }
      setShowModal(false); load()
    } catch (e: any) { setError(e?.message||'حدث خطأ') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>
  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="📋 خطط الاشتراك" subtitle={`${plans.length} خطة`} actions={<Button variant="gold" onClick={()=>{setEditPlan(null);setError(null);setForm({name:'',price:'',currency:'SAR',max_users:'10',max_workers:'100',trial_days:'14',is_active:true,f1:'',f2:'',f3:'',f4:'',f5:''});setShowModal(true)}}>+ خطة جديدة</Button>} />
      {plans.length === 0 ? <EmptyState icon="📋" title="لا توجد خطط" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(plan=>(
            <Card key={plan.id} className={`p-5 border ${plan.is_active?'border-brand-blue/30':'border-gray-800 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3"><h3 className="text-white font-bold text-lg">{plan.name}</h3><Badge variant={plan.is_active?'green':'gray'}>{plan.is_active?'نشط':'معطل'}</Badge></div>
              <div className="mb-4"><span className="text-3xl font-bold text-brand-gold-light">{plan.price.toLocaleString()}</span><span className="text-gray-400 text-sm"> {plan.currency}/سنة</span></div>
              <div className="space-y-1.5 mb-4 text-sm text-gray-300"><p>👥 حتى {plan.max_users} مستخدم</p><p>👷 حتى {plan.max_workers} عامل</p>{plan.trial_days>0 && <p>🎁 {plan.trial_days} يوم تجريبي</p>}</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={()=>{setEditPlan(plan);setError(null);const features=Array.isArray(plan.features)?plan.features as string[]:[];setForm({name:plan.name,price:String(plan.price),currency:plan.currency,max_users:String(plan.max_users),max_workers:String(plan.max_workers),trial_days:String(plan.trial_days),is_active:plan.is_active,f1:features[0]||'',f2:features[1]||'',f3:features[2]||'',f4:features[3]||'',f5:features[4]||''});setShowModal(true)}} className="flex-1">تعديل</Button>
                <Button variant={plan.is_active?'danger':'primary'} size="sm" onClick={async()=>{await supabase.from('subscription_plans').update({is_active:!plan.is_active}).eq('id',plan.id);load()}} className="flex-1">{plan.is_active?'إيقاف':'تفعيل'}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editPlan?'تعديل الخطة':'إضافة خطة جديدة'} footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant="gold" loading={saving} onClick={save}>{editPlan?'حفظ':'إضافة'}</Button></>}>
        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input label="اسم الخطة *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Input label="السعر السنوي *" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
          <Input label="العملة" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} />
          <Input label="أيام التجربة" type="number" value={form.trial_days} onChange={e=>setForm(f=>({...f,trial_days:e.target.value}))} />
          <Input label="أقصى مستخدمين" type="number" value={form.max_users} onChange={e=>setForm(f=>({...f,max_users:e.target.value}))} />
          <Input label="أقصى عمال" type="number" value={form.max_workers} onChange={e=>setForm(f=>({...f,max_workers:e.target.value}))} />
        </div>
        <p className="text-gray-400 text-sm font-medium mb-2">المميزات (حتى 5)</p>
        <div className="space-y-2">{(['f1','f2','f3','f4','f5'] as const).map((k,i)=>(<Input key={k} placeholder={`ميزة ${i+1}`} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />))}</div>
        <div className="flex items-center gap-3 mt-4"><input type="checkbox" id="is_active" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 rounded" /><label htmlFor="is_active" className="text-gray-300 text-sm">الخطة نشطة وقابلة للاشتراك</label></div>
      </Modal>
    </div>
  )
}
