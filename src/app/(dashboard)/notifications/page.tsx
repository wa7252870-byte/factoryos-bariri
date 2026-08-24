'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth, hasPermission } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal, Input, Select } from '@/components/ui'
import type { Notification, Role } from '@/types/database'

const TYPE_LABELS: Record<string,string> = { info:'معلومة', warning:'تنبيه', error:'خطأ', success:'نجاح', announcement:'إعلان' }
const TYPE_COLORS: Record<string,any> = { info:'blue', warning:'yellow', error:'red', success:'green', announcement:'gold' }

export default function NotificationsPage() {
  const { user, orgId, role } = useAuth()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title:'', message:'', type:'info', target:'all', target_role_id:'' })
  const canSend = hasPermission(role, 'factory_manager','general_manager','super_admin','platform_owner')

  const load = useCallback(async () => {
    if (!orgId && !user) return
    try {
      const { data } = await supabase.from('notifications').select('*').or(orgId ? `organization_id.eq.${orgId},user_id.eq.${user?.id}` : `user_id.eq.${user?.id}`).order('created_at', { ascending: false }).limit(50)
      setNotifications(data||[])
      const { data: rolesData } = await supabase.from('roles').select('*').order('name')
      setRoles(rolesData||[])
    } catch {}
    finally { setLoading(false) }
  }, [orgId, user?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!orgId) return
    const ch = supabase.channel('notifs-realtime').on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`organization_id=eq.${orgId}` }, () => load()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId, load])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(ns => ns.map(n => n.id===id ? {...n, read_at: new Date().toISOString()} : n))
  }

  async function sendNotification() {
    if (!orgId||!user) return
    if (!form.title.trim()||!form.message.trim()) { setError('العنوان والرسالة مطلوبان'); return }
    setSending(true); setError(null)
    try {
      const payload: any = { organization_id: orgId, sender_id: user.id, title: form.title.trim(), message: form.message.trim(), type: form.type }
      if (form.target==='role'&&form.target_role_id) payload.target_role_id = form.target_role_id
      const { error: e } = await supabase.from('notifications').insert(payload)
      if (e) throw e
      setSuccess('تم إرسال الإشعار بنجاح ✓'); setShowSendModal(false); setForm({ title:'', message:'', type:'info', target:'all', target_role_id:'' }); load(); setTimeout(() => setSuccess(null), 3000)
    } catch (e:any) { setError(e?.message||'حدث خطأ في الإرسال') }
    finally { setSending(false) }
  }

  const unreadCount = notifications.filter(n=>!n.read_at).length
  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="🔔 الإشعارات" subtitle={unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
        actions={<div className="flex gap-2">{unreadCount > 0 && <Button variant="secondary" size="sm" onClick={async()=>{const unread=notifications.filter(n=>!n.read_at).map(n=>n.id);await supabase.from('notifications').update({read_at:new Date().toISOString()}).in('id',unread);load()}}>قراءة الكل</Button>}{canSend && <Button variant="primary" size="sm" onClick={()=>{ setShowSendModal(true); setError(null) }}>+ إرسال إشعار</Button>}</div>}
      />
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {notifications.length === 0 ? <EmptyState icon="🔔" title="لا توجد إشعارات" desc="ستظهر الإشعارات هنا عند إرسالها" /> : (
        <div className="space-y-2">
          {notifications.map(n=>(
            <div key={n.id} onClick={()=>!n.read_at&&markRead(n.id)} className={`p-4 rounded-xl border transition-all cursor-pointer ${!n.read_at ? 'bg-brand-surface border-brand-blue/40 shadow-md' : 'bg-brand-surface-2/50 border-gray-800/50 opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-brand-blue-light flex-shrink-0 animate-pulse" />}
                    <p className="text-white font-medium text-sm">{n.title}</p>
                    <Badge variant={TYPE_COLORS[n.type]||'gray'}>{TYPE_LABELS[n.type]||n.type}</Badge>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{n.message}</p>
                  <p className="text-gray-600 text-xs mt-2">{new Date(n.created_at).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                {n.read_at && <span className="text-green-600 text-xs flex-shrink-0">✓ مقروء</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={showSendModal} onClose={()=>setShowSendModal(false)} title="إرسال إشعار"
        footer={<><Button variant="secondary" onClick={()=>setShowSendModal(false)}>إلغاء</Button><Button variant="primary" loading={sending} onClick={sendNotification}>إرسال</Button></>}
      >
        {error&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          <Input label="العنوان *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="عنوان الإشعار" />
          <div><label className="block text-sm font-medium text-gray-300 mb-1.5">الرسالة *</label><textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={3} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" placeholder="محتوى الإشعار..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع الإشعار" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} options={[{value:'info',label:'معلومة'},{value:'warning',label:'تنبيه'},{value:'success',label:'نجاح'},{value:'announcement',label:'إعلان'}]} />
            <Select label="الإرسال إلى" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} options={[{value:'all',label:'جميع الموظفين'},{value:'role',label:'دور محدد'}]} />
          </div>
          {form.target==='role' && <Select label="الدور" value={form.target_role_id} onChange={e=>setForm(f=>({...f,target_role_id:e.target.value}))} options={roles.map(r=>({value:r.id,label:r.name}))} placeholder="اختر الدور" />}
        </div>
      </Modal>
    </div>
  )
}
