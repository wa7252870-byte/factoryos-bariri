'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner, Badge, ShiftBadge } from '@/components/ui'

function getElapsedMinutes(entryTime: string): number {
  const [h, m, s] = entryTime.split(':').map(Number)
  const now = new Date()
  const entry = new Date()
  entry.setHours(h, m, s || 0, 0)
  return Math.floor((now.getTime() - entry.getTime()) / 60000)
}

function statusColor(elapsed: number, window: number) {
  if (elapsed < window * 0.7) return 'green'
  if (elapsed < window) return 'yellow'
  return 'red'
}

export default function Gate2Page() {
  const { user, orgId } = useAuth()
  const supabase = createClient()
  const [pending, setPending] = useState<any[]>([])
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [windowMinutes, setWindowMinutes] = useState(60)
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!orgId) return
    try {
      const { data: setting } = await supabase.from('system_settings').select('value').eq('organization_id', orgId).eq('key', 'gate2_window_minutes').single()
      if (setting?.value) setWindowMinutes(parseInt(setting.value))
      const [g1Res, g2Res] = await Promise.all([
        supabase.from('gate_entries').select('*, worker:workers(*, worker_type:worker_types(*), shift:shifts(*))').eq('organization_id', orgId).eq('entry_date', today).order('entry_time', { ascending: true }),
        supabase.from('production_entries').select('worker_id').eq('organization_id', orgId).eq('production_date', today),
      ])
      const confirmed = new Set((g2Res.data || []).map((e: any) => e.worker_id))
      setPending((g1Res.data || []).filter((e: any) => !confirmed.has(e.worker_id)))
      setConfirmedCount(confirmed.size)
    } catch { setError('حدث خطأ في تحميل البيانات') }
    finally { setLoading(false) }
  }, [orgId, today])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { const t = setInterval(() => loadData(), 30000); return () => clearInterval(t) }, [loadData])

  useEffect(() => {
    if (!orgId) return
    const ch = supabase.channel('gate2-realtime')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'gate_entries', filter:`organization_id=eq.${orgId}` }, () => loadData())
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'production_entries', filter:`organization_id=eq.${orgId}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId, loadData])

  async function confirm(entry: any) {
    if (!orgId || !user) return
    setConfirmingId(entry.id); setError(null)
    try {
      const { error: rpcErr } = await supabase.rpc('confirm_gate_entry', { p_gate_entry_id: entry.id })
      if (rpcErr) {
        const { error: insErr } = await supabase.from('production_entries').insert({
          organization_id: orgId, worker_id: entry.worker_id,
          production_date: today, check_in_time: new Date().toTimeString().split(' ')[0],
          confirmed_by: user.id,
        })
        if (insErr) {
          setError(insErr.code === '23505' ? `${entry.worker?.full_name} مؤكد مسبقاً` : `خطأ: ${insErr.message}`)
          return
        }
      }
      loadData()
    } catch { setError('حدث خطأ غير متوقع') }
    finally { setConfirmingId(null) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner text="جاري تحميل بيانات البوابة 2..." /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="✅ البوابة 2 — تأكيد الحضور"
        subtitle={`نافذة التأكيد: ${windowMinutes} دقيقة (من system_settings)`}
        actions={pending.length > 0 ? <Button variant="gold" size="sm" onClick={() => pending.forEach(e => confirm(e))}>تأكيد الكل ({pending.length})</Button> : undefined}
      />
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={() => setError(null)}>✕</button></div>}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center"><p className="text-3xl font-bold text-yellow-400">{pending.length}</p><p className="text-gray-400 text-sm mt-1">في الانتظار</p></Card>
        <Card className="p-4 text-center"><p className="text-3xl font-bold text-green-400">{confirmedCount}</p><p className="text-gray-400 text-sm mt-1">تم التأكيد</p></Card>
        <Card className="p-4 text-center"><p className="text-3xl font-bold text-red-400">{pending.filter(e => getElapsedMinutes(e.entry_time) >= windowMinutes).length}</p><p className="text-gray-400 text-sm mt-1">تجاوز الوقت</p></Card>
      </div>
      {pending.length === 0 ? (
        <Card className="py-20 text-center"><span className="text-5xl block mb-3">✅</span><p className="text-gray-300">جميع العمال تم تأكيد دخولهم</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pending.map(entry => {
            const elapsed = getElapsedMinutes(entry.entry_time)
            const status = statusColor(elapsed, windowMinutes)
            const bc = status === 'green' ? 'border-green-700/50' : status === 'yellow' ? 'border-yellow-700/50' : 'border-red-700/50'
            const dc = status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
            const tc = status === 'green' ? 'text-green-400' : status === 'yellow' ? 'text-yellow-400' : 'text-red-400'
            return (
              <Card key={entry.id} className={`p-4 border ${bc}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{entry.worker?.full_name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{entry.worker?.worker_code}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${dc} mt-1 flex-shrink-0 ${status==='red'?'animate-pulse':''}`} />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="gray">{entry.worker?.worker_type?.name}</Badge>
                  <ShiftBadge shift={entry.worker?.shift?.name || ''} />
                </div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-400">دخل الساعة</span>
                  <span className="text-white font-mono">{entry.entry_time?.slice(0,5)}</span>
                </div>
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-gray-400">منذ</span>
                  <span className={`font-bold ${tc}`}>{elapsed} دقيقة</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${dc}`} style={{ width: `${Math.min((elapsed/windowMinutes)*100,100)}%` }} />
                </div>
                <Button variant="primary" size="sm" className="w-full" loading={confirmingId===entry.id} onClick={() => confirm(entry)}>
                  تأكيد الحضور
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
