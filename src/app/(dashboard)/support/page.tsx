'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth, hasPermission } from '@/hooks/useAuth'
import { Button, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Modal, Select } from '@/components/ui'
import type { SupportTicket, SupportMessage } from '@/types/database'

const STATUS_L: Record<string,string> = {open:'مفتوح',in_progress:'قيد المعالجة',resolved:'محلول',closed:'مغلق'}
const STATUS_C: Record<string,any> = {open:'red',in_progress:'yellow',resolved:'green',closed:'gray'}
const PRI_L: Record<string,string> = {low:'منخفض',medium:'متوسط',high:'عالي',urgent:'عاجل'}

export default function SupportPage() {
  const { user, orgId, role } = useAuth()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title:'', category:'', description:'', priority:'medium' })
  const isPlatform = hasPermission(role, 'platform_owner','super_admin')

  const loadTickets = useCallback(async () => {
    try {
      let q = supabase.from('support_tickets').select('*, organization:organizations(name)').order('created_at',{ascending:false}).limit(50)
      if (!isPlatform && orgId) q = q.eq('organization_id', orgId)
      const { data } = await q
      setTickets((data as any)||[])
    } catch {}
    finally { setLoading(false) }
  }, [orgId, isPlatform])

  useEffect(() => { loadTickets() }, [loadTickets])

  async function openTicket(ticket: SupportTicket) {
    setSelected(ticket); setLoadingMsgs(true)
    const { data } = await supabase.from('support_messages').select('*').eq('ticket_id', ticket.id).order('created_at',{ascending:true})
    setMessages(data||[]); setLoadingMsgs(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100)
  }

  useEffect(() => {
    if (!selected) return
    const ch = supabase.channel(`ticket-${selected.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages',filter:`ticket_id=eq.${selected.id}`}, payload => { setMessages(m=>[...m, payload.new as SupportMessage]); setTimeout(() => bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100) }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected?.id])

  async function sendMessage() {
    if (!selected||!user||!newMsg.trim()) return
    setSending(true)
    try { await supabase.from('support_messages').insert({ ticket_id: selected.id, organization_id: selected.organization_id, sender_id: user.id, message: newMsg.trim() }); setNewMsg('') }
    catch { setError('حدث خطأ في الإرسال') }
    finally { setSending(false) }
  }

  async function createTicket() {
    if (!orgId||!user) return
    if (!form.title.trim()||!form.description.trim()) { setError('العنوان والوصف مطلوبان'); return }
    setCreating(true); setError(null)
    try {
      const { error: e } = await supabase.from('support_tickets').insert({ organization_id: orgId, created_by: user.id, title: form.title.trim(), category: form.category||null, description: form.description.trim(), priority: form.priority, status: 'open' })
      if (e) throw e
      setShowModal(false); setForm({title:'',category:'',description:'',priority:'medium'}); loadTickets()
    } catch (e:any) { setError(e?.message||'حدث خطأ') }
    finally { setCreating(false) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="🎧 الدعم الفني" actions={!isPlatform ? <Button variant="primary" onClick={()=>{setShowModal(true);setError(null)}}>+ تذكرة جديدة</Button> : undefined} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{height:'calc(100vh - 200px)'}}>
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800 text-sm text-gray-400">التذاكر ({tickets.length})</div>
          <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 ? <EmptyState icon="🎧" title="لا توجد تذاكر" /> : tickets.map(t=>(
              <button key={t.id} onClick={()=>openTicket(t)} className={`w-full text-right p-3 border-b border-gray-800/50 hover:bg-brand-surface-2 transition-colors ${selected?.id===t.id?'bg-brand-surface-2 border-r-2 border-r-brand-blue-light':''}`}>
                <div className="flex items-start justify-between gap-2 mb-1"><p className="text-white text-sm font-medium truncate flex-1">{t.title}</p><Badge variant={STATUS_C[t.status]}>{STATUS_L[t.status]}</Badge></div>
                <div className="flex items-center gap-2 flex-wrap"><Badge variant={t.priority==='urgent'||t.priority==='high'?'red':'yellow'}>{PRI_L[t.priority]}</Badge>{isPlatform && <span className="text-gray-500 text-xs">{(t as any).organization?.name}</span>}<span className="text-gray-600 text-xs mr-auto">{new Date(t.created_at).toLocaleDateString('ar-EG',{month:'short',day:'numeric'})}</span></div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          {!selected ? <div className="flex-1 flex items-center justify-center"><EmptyState icon="💬" title="اختر تذكرة لعرض المحادثة" /></div> : (
            <>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
                <div><p className="text-white font-semibold text-sm">{selected.title}</p><p className="text-gray-400 text-xs mt-0.5">{selected.description}</p></div>
                {isPlatform && <div className="flex gap-2">{selected.status!=='resolved' && <Button variant="primary" size="sm" onClick={()=>{supabase.from('support_tickets').update({status:'resolved'}).eq('id',selected.id);setSelected(t=>t?{...t,status:'resolved' as any}:null);loadTickets()}}>تحديد كمحلول</Button>}{selected.status==='open' && <Button variant="secondary" size="sm" onClick={()=>{supabase.from('support_tickets').update({status:'in_progress'}).eq('id',selected.id);setSelected(t=>t?{...t,status:'in_progress' as any}:null);loadTickets()}}>قيد المعالجة</Button>}</div>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? <LoadingSpinner /> : messages.length === 0 ? <div className="text-center text-gray-500 text-sm py-8">لا توجد رسائل. ابدأ المحادثة.</div> : messages.map(m=>{
                  const isMe = m.sender_id === user?.id
                  return <div key={m.id} className={`flex ${isMe?'justify-start':'justify-end'}`}><div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe?'bg-brand-blue text-white rounded-tr-sm':'bg-brand-surface-2 text-gray-200 rounded-tl-sm'}`}><p className="leading-relaxed">{m.message}</p><p className={`text-xs mt-1 ${isMe?'text-blue-200':'text-gray-500'}`}>{new Date(m.created_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</p></div></div>
                })}
                <div ref={bottomRef} />
              </div>
              {selected.status !== 'closed' && (
                <div className="p-4 border-t border-gray-800 flex gap-3">
                  <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="اكتب رسالتك..." className="flex-1 bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light" />
                  <Button variant="primary" size="sm" loading={sending} onClick={sendMessage} disabled={!newMsg.trim()}>إرسال</Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      <Modal open={showModal} onClose={()=>setShowModal(false)} title="تذكرة دعم جديدة" footer={<><Button variant="secondary" onClick={()=>setShowModal(false)}>إلغاء</Button><Button variant="primary" loading={creating} onClick={createTicket}>إرسال التذكرة</Button></>}>
        {error&&<div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          <Input label="العنوان *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="وصف المشكلة باختصار" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="التصنيف" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="تقني / مالي / عام" />
            <Select label="الأولوية" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} options={[{value:'low',label:'منخفض'},{value:'medium',label:'متوسط'},{value:'high',label:'عالي'},{value:'urgent',label:'عاجل'}]} />
          </div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1.5">الوصف التفصيلي *</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={4} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" placeholder="اشرح المشكلة بالتفصيل..." /></div>
        </div>
      </Modal>
    </div>
  )
}
