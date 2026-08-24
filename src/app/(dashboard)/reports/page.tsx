'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner } from '@/components/ui'
import type { Worker, WorkerType, Shift } from '@/types/database'

type WorkerFull = Worker & { worker_type: WorkerType; shift: Shift }
const TYPE_LABELS: Record<string, string> = { WORKER:'العمال', TECHNICIAN:'الفنيون', SUPERVISOR:'المشرفون' }
const TYPE_ICONS: Record<string, string> = { WORKER:'👷', TECHNICIAN:'🔧', SUPERVISOR:'👔' }

export default function ReportsPage() {
  const { orgId } = useAuth()
  const supabase = createClient()
  const [workers, setWorkers] = useState<WorkerFull[]>([])
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [periodStart, setPeriodStart] = useState(() => { const d = new Date(); d.setDate(d.getDate()-6); return d.toISOString().split('T')[0] })
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0])

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [wRes, tRes] = await Promise.all([
        supabase.from('workers').select('*, worker_type:worker_types(*), shift:shifts(*)').eq('organization_id', orgId).eq('status', 'ACTIVE').order('full_name'),
        supabase.from('worker_types').select('*'),
      ])
      setWorkers((wRes.data as any)||[]); setWorkerTypes(tRes.data||[])
    } catch {}
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function generateExcel(workerTypeName?: string) {
    if (!orgId) return
    setGenerating(true)
    try {
      const { data: records } = await supabase.from('attendance_records').select('worker_id, attendance_date, status').eq('organization_id', orgId).gte('attendance_date', periodStart).lte('attendance_date', periodEnd)
      const days: string[] = []
      const curr = new Date(periodStart)
      while (curr <= new Date(periodEnd)) { days.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate()+1) }
      const filtered = workerTypeName ? workers.filter(w => w.worker_type?.name === workerTypeName) : workers
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const dayHeaders = days.map(d => new Date(d).toLocaleDateString('ar-EG', { weekday:'short', month:'numeric', day:'numeric' }))
      const header = ['الاسم', 'الرقم الوطني', 'رقم الحساب', 'اسم صاحب الحساب', ...dayHeaders, 'إجمالي الحضور', 'إجمالي الغياب', 'الأجر اليومي', 'الإجمالي']
      const rows = filtered.map(worker => {
        const workerRecs = (records||[]).filter(r => r.worker_id === worker.id)
        const dayData = days.map(date => workerRecs.some(r => r.attendance_date === date && r.status === 'PRESENT') ? '✓' : '✕')
        const totalPresent = dayData.filter(d => d === '✓').length
        const totalAbsent = days.length - totalPresent
        const totalAmount = worker.wage_type === 'daily' ? totalPresent * worker.daily_rate : (worker.monthly_rate / 30) * totalPresent
        return [worker.full_name, worker.national_id, worker.bank_account||'', worker.account_holder_name||'', ...dayData, totalPresent, totalAbsent, worker.daily_rate, totalAmount]
      })
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
      ws['!cols'] = [{wch:25},{wch:15},{wch:20},{wch:20},...days.map(()=>({wch:10})),{wch:12},{wch:12},{wch:12},{wch:15}]
      XLSX.utils.book_append_sheet(wb, ws, workerTypeName ? TYPE_LABELS[workerTypeName] : 'الكل')
      const fileName = `تقرير_${workerTypeName ? TYPE_LABELS[workerTypeName] : 'شامل'}_${periodStart}_${periodEnd}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch { alert('حدث خطأ في توليد التقرير') }
    finally { setGenerating(false) }
  }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>
  const dayCount = Math.ceil((new Date(periodEnd).getTime()-new Date(periodStart).getTime())/86400000)+1

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="📊 تقارير Excel" subtitle="ملفات xlsx حقيقية بالحضور والأجور" />
      <Card className="p-5 mb-6">
        <h3 className="text-white font-semibold mb-4">إعدادات الفترة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm font-medium text-gray-300 mb-1.5">من تاريخ</label><input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light" /></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-1.5">إلى تاريخ</label><input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)} className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light" /></div>
        </div>
        <div className="bg-brand-surface-2 rounded-xl p-3 text-sm text-gray-400">الفترة: {new Date(periodStart).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})} — {new Date(periodEnd).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})} ({dayCount} يوم)</div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {workerTypes.map(type => (
          <Card key={type.id} className="p-5">
            <div className="text-center mb-4"><span className="text-4xl block mb-2">{TYPE_ICONS[type.name]||'👷'}</span><h3 className="text-white font-bold text-lg">{TYPE_LABELS[type.name]||type.name}</h3><p className="text-gray-400 text-sm mt-1">{workers.filter(w=>w.worker_type_id===type.id).length} عامل</p></div>
            <Button variant="gold" className="w-full" loading={generating} onClick={()=>generateExcel(type.name)}>تحميل Excel</Button>
          </Card>
        ))}
        <Card className="p-5 border-brand-blue/30">
          <div className="text-center mb-4"><span className="text-4xl block mb-2">📊</span><h3 className="text-white font-bold text-lg">تقرير شامل</h3><p className="text-gray-400 text-sm mt-1">جميع الفئات ({workers.length} عامل)</p></div>
          <Button variant="primary" className="w-full" loading={generating} onClick={()=>generateExcel()}>تحميل التقرير الشامل</Button>
        </Card>
      </div>
    </div>
  )
}
