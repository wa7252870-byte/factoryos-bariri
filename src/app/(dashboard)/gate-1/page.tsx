'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, PageHeader, LoadingSpinner, Badge, ShiftBadge } from '@/components/ui'
import type { Worker, WorkerType, Shift } from '@/types/database'

export default function Gate1Page() {
  const { user, orgId } = useAuth()
  const supabase = createClient()
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [todayEntries, setTodayEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [notes, setNotes] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    if (!orgId) return
    try {
      const [typesRes, shiftsRes, entriesRes] = await Promise.all([
        supabase.from('worker_types').select('*').order('name'),
        supabase.from('shifts').select('*').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('gate_entries').select('*, worker:workers(*, worker_type:worker_types(*), shift:shifts(*))').eq('organization_id', orgId).eq('entry_date', today).order('entry_time', { ascending: false }),
      ])
      if (typesRes.data) setWorkerTypes(typesRes.data)
      if (shiftsRes.data) setShifts(shiftsRes.data)
      if (entriesRes.data) setTodayEntries(entriesRes.data)
    } catch { setError('حدث خطأ في تحميل البيانات') }
    finally { setLoading(false) }
  }, [orgId, today])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!orgId) return
    const channel = supabase.channel('gate1-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gate_entries', filter: `organization_id=eq.${orgId}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId, loadData])

  async function searchWorkers(q: string) {
    if (!orgId || q.trim().length < 2) { setSearchResults([]); return }
    const { data } = await supabase.from('workers').select('*, worker_type:worker_types(*), shift:shifts(*)')
      .eq('organization_id', orgId).eq('status', 'ACTIVE')
      .or(`full_name.ilike.%${q}%,national_id.ilike.%${q}%,worker_code.ilike.%${q}%`).limit(8)
    setSearchResults((data as any) || [])
  }

  async function handleRegister() {
    if (!selectedWorker || !orgId || !user) return
    setSubmitting(true); setError(null)
    try {
      const { error: insertError } = await supabase.from('gate_entries').insert({
        organization_id: orgId,
        worker_id: selectedWorker.id,
        entry_date: today,
        entry_time: new Date().toTimeString().split(' ')[0],
        recorded_by: user.id,
        notes: notes.trim() || null,
      })
      if (insertError) {
        if (insertError.code === '23505') { setError(`${selectedWorker.full_name} مسجّل دخوله اليوم مسبقاً`) }
        else { setError('حدث خطأ أثناء التسجيل. حاول مجدداً.') }
        return
      }
      setSuccess(`تم تسجيل دخول ${selectedWorker.full_name} بنجاح ✓`)
      setSelectedWorker(null); setSearchQuery(''); setSearchResults([]); setNotes('')
      loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch { setError('حدث خطأ غير متوقع. حاول مجدداً.') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner text="جاري تحميل بيانات البوابة..." /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="🚭 البوابة 1 — تسجيل الدخول"
        subtitle={`اليوم: ${new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`}
      />
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={() => setError(null)}>✕</button></div>}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-white font-semibold mb-4">تسجيل دخول عامل</h2>
          <div className="mb-4 relative">
            <Input label="بحث بالاسم / الرقم الوطني / الكود" placeholder="اكتب للبحث..."
              value={searchQuery} onChange={e => { setSearchQuery(e.target.value); searchWorkers(e.target.value) }} />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-brand-surface-2 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                {searchResults.map(w => (
                  <button key={w.id} onClick={() => { setSelectedWorker(w); setSearchResults([]); setSearchQuery(w.full_name) }}
                    className="w-full text-right px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0">
                    <p className="text-white text-sm font-medium">{w.full_name}</p>
                    <p className="text-gray-400 text-xs">{w.worker_code} · {(w as any).worker_type?.name} · {(w as any).shift?.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedWorker && (
            <div className="bg-brand-surface-2 border border-brand-blue/40 rounded-xl p-4 mb-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-bold">{selectedWorker.full_name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{selectedWorker.national_id}</p>
                </div>
                <button onClick={() => { setSelectedWorker(null); setSearchQuery('') }} className="text-gray-500 hover:text-white text-sm">✕</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="blue">{selectedWorker.worker_code}</Badge>
                <Badge variant="gray">{(selectedWorker as any).worker_type?.name}</Badge>
                <ShiftBadge shift={(selectedWorker as any).shift?.name || ''} />
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light resize-none" />
          </div>
          <Button variant="primary" size="lg" className="w-full" disabled={!selectedWorker} loading={submitting} onClick={handleRegister}>
            تسجيل الدخول
          </Button>
        </Card>
        <Card className="lg:col-span-3 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">سجل اليوم</h2>
            <Badge variant="blue">{todayEntries.length} دخول</Badge>
          </div>
          {todayEntries.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center"><span className="text-4xl">🚭</span><p className="text-gray-400">لا توجد تسجيلات اليوم بعد</p></div>
          ) : (
            <div className="overflow-y-auto max-h-[500px]">
              {todayEntries.map((entry: any) => (
                <div key={entry.id} className="px-4 py-3 border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{entry.worker?.full_name}</p>
                      <p className="text-gray-400 text-xs">{entry.worker?.worker_code} · {entry.worker?.worker_type?.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-brand-blue-light text-sm font-mono">{entry.entry_time?.slice(0,5)}</p>
                      <ShiftBadge shift={entry.worker?.shift?.name || ''} />
                    </div>
                  </div>
                  {entry.notes && <p className="text-gray-500 text-xs mt-1">📝 {entry.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[{label:'عمال',type:'WORKER',icon:'👷'},{label:'فنيون',type:'TECHNICIAN',icon:'🔧'},{label:'مشرفون',type:'SUPERVISOR',icon:'👔'}].map(({label,type,icon}) => (
          <Card key={type} className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-2xl font-bold text-white">{todayEntries.filter((e:any) => e.worker?.worker_type?.name === type).length}</p>
                <p className="text-gray-400 text-xs">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
