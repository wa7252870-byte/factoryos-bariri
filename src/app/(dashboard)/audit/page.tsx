'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, PageHeader, LoadingSpinner, EmptyState, Badge } from '@/components/ui'
import type { AuditLog } from '@/types/database'

const ACTION_LABELS: Record<string,string> = {
  INSERT:'أضاف', UPDATE:'عدّل', DELETE:'حذف', LOGIN:'سجّل دخوله', LOGOUT:'سجّل خروجه',
  CONFIRM:'أكّد', GENERATE:'أنشأ', APPROVE:'اعتمد', PAY:'دفع', UPLOAD:'رفع ملفاً', SELECT:'استعرض',
}

function humanize(log: AuditLog): string {
  const action = ACTION_LABELS[log.action?.toUpperCase()] || log.action
  const resource = log.resource_type || 'سجل'
  const time = new Date(log.created_at).toLocaleString('ar-EG', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
  return `قام المستخدم بـ ${action} في ${resource} — ${time}`
}

export default function AuditPage() {
  const { orgId } = useAuth()
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      let q = supabase.from('audit_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (filterAction) q = q.eq('action', filterAction)
      if (filterResource) q = q.eq('resource_type', filterResource)
      const { data } = await q
      if (page === 0) setLogs(data||[])
      else setLogs(prev => [...prev, ...(data||[])])
    } catch {}
    finally { setLoading(false) }
  }, [orgId, filterAction, filterResource, page])

  useEffect(() => { setPage(0); setLogs([]) }, [filterAction, filterResource])
  useEffect(() => { load() }, [load])

  const actions = [...new Set(logs.map(l=>l.action).filter(Boolean))]
  const resources = [...new Set(logs.map(l=>l.resource_type).filter(Boolean))]

  if (loading && page === 0) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="📋 سجل العمليات" subtitle="جميع الأنشطة مُسجَّلة بلغة عربية واضحة" />
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-blue-light">
          <option value="">كل الإجراءات</option>
          {actions.map(a=><option key={a} value={a}>{ACTION_LABELS[a?.toUpperCase()]||a}</option>)}
        </select>
        <select value={filterResource} onChange={e=>setFilterResource(e.target.value)} className="bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-blue-light">
          <option value="">كل الموارد</option>
          {resources.map(r=><option key={r} value={r!}>{r}</option>)}
        </select>
        <span className="text-gray-500 text-sm">{logs.length} سجل</span>
      </div>
      {logs.length === 0 ? <EmptyState icon="📋" title="لا توجد سجلات عمليات" desc="العمليات ستظهر هنا عند تنفيذها" /> : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-800">
            {logs.map(log=>(
              <div key={log.id} className="px-5 py-4 hover:bg-brand-surface-2/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-relaxed">{humanize(log)}</p>
                    {log.resource_id && <p className="text-gray-600 text-xs mt-0.5 font-mono truncate">{log.resource_id}</p>}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {log.action && <Badge variant="blue">{ACTION_LABELS[log.action?.toUpperCase()]||log.action}</Badge>}
                    {log.resource_type && <Badge variant="gray">{log.resource_type}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {logs.length >= (page+1)*PAGE_SIZE && (
            <div className="p-4 text-center border-t border-gray-800">
              <button onClick={()=>setPage(p=>p+1)} className="text-brand-blue-light text-sm hover:underline">تحميل المزيد...</button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
