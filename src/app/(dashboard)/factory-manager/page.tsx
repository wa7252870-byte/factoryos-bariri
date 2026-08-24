'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, PageHeader, LoadingSpinner, StatCard, Badge, ShiftBadge } from '@/components/ui'

export default function FactoryManagerPage() {
  const { orgId } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState({ todayGate1:0, todayGate2:0, todayAbsent:0, activeWorkers:0, pendingPayrolls:0, openTickets:0, unreadNotifs:0 })
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [g1, g2, workers, payrolls, tickets, notifs, entries] = await Promise.all([
        supabase.from('gate_entries').select('id', { count:'exact', head:true }).eq('organization_id', orgId).eq('entry_date', today),
        supabase.from('production_entries').select('id', { count:'exact', head:true }).eq('organization_id', orgId).eq('production_date', today),
        supabase.from('workers').select('id', { count:'exact', head:true }).eq('organization_id', orgId).eq('status', 'ACTIVE'),
        supabase.from('payrolls').select('id', { count:'exact', head:true }).eq('organization_id', orgId).eq('status', 'Draft'),
        supabase.from('support_tickets').select('id', { count:'exact', head:true }).eq('organization_id', orgId).in('status', ['open','in_progress']),
        supabase.from('notifications').select('id', { count:'exact', head:true }).eq('organization_id', orgId).is('read_at', null),
        supabase.from('gate_entries').select('*, worker:workers(full_name, worker_type:worker_types(name), shift:shifts(name))').eq('organization_id', orgId).eq('entry_date', today).order('entry_time', { ascending:false }).limit(8),
      ])
      setStats({
        todayGate1: g1.count||0, todayGate2: g2.count||0,
        todayAbsent: Math.max(0, (workers.count||0)-(g2.count||0)),
        activeWorkers: workers.count||0, pendingPayrolls: payrolls.count||0,
        openTickets: tickets.count||0, unreadNotifs: notifs.count||0,
      })
      setRecentEntries((entries.data as any)||[])
    } catch {}
    finally { setLoading(false) }
  }, [orgId, today])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader
        title="⚙️ لوحة تحكم المدير"
        subtitle={new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
      />
      <p className="text-gray-400 text-sm font-medium mb-3">إحصائيات اليوم</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="دخول البوابة 1" value={stats.todayGate1} icon="🚭" color="blue" />
        <StatCard label="مؤكد البوابة 2" value={stats.todayGate2} icon="✅" color="green" />
        <StatCard label="غياب متوقع" value={stats.todayAbsent} icon="❌" color="red" />
        <StatCard label="العمال النشطون" value={stats.activeWorkers} icon="👷" color="blue" />
      </div>
      <p className="text-gray-400 text-sm font-medium mb-3">تنبيهات تحتاج انتباهاً</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label:'كشوف رواتب بانتظار الاعتماد', value:stats.pendingPayrolls, icon:'💰', color:stats.pendingPayrolls>0?'border-yellow-700/60 text-yellow-400':'border-gray-800 text-gray-500' },
          { label:'تذاكر دعم مفتوحة', value:stats.openTickets, icon:'🎧', color:stats.openTickets>0?'border-red-700/60 text-red-400':'border-gray-800 text-gray-500' },
          { label:'إشعارات غير مقروءة', value:stats.unreadNotifs, icon:'🔔', color:stats.unreadNotifs>0?'border-brand-blue/60 text-brand-blue-light':'border-gray-800 text-gray-500' },
        ].map(s=>(
          <Card key={s.label} className={`p-4 border ${s.color.split(' ')[0]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">آخر دخولات البوابة اليوم</h3>
          <Badge variant="blue">{recentEntries.length}</Badge>
        </div>
        {recentEntries.length === 0 ? (
          <div className="py-12 text-center text-gray-500">لا توجد دخولات اليوم بعد</div>
        ) : recentEntries.map((e:any) => (
          <div key={e.id} className="px-4 py-3 border-b border-gray-800/50 flex items-center justify-between hover:bg-brand-surface-2/30 transition-colors">
            <div>
              <p className="text-white text-sm font-medium">{e.worker?.full_name}</p>
              <p className="text-gray-500 text-xs">{e.worker?.worker_type?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <ShiftBadge shift={e.worker?.shift?.name||''} />
              <span className="text-brand-blue-light font-mono text-sm">{e.entry_time?.slice(0,5)}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
