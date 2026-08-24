'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner } from '@/components/ui'
import type { SystemSetting, Organization } from '@/types/database'

const SETTING_META: Record<string, { label: string; desc: string; type?: string }> = {
  gate2_window_minutes: { label:'نافذة تأكيد البوابة 2 (دقيقة)', desc:'المدة المسموح بها بين البوابة 1 والبوابة 2.', type:'number' },
  default_currency: { label:'العملة الافتراضية', desc:'العملة المستخدمة في الرواتب والمدفوعات' },
  working_days_per_month: { label:'أيام العمل الشهرية', desc:'عدد أيام العمل لحساب الراتب الشهري', type:'number' },
  payroll_day: { label:'يوم صرف الراتب', desc:'اليوم من الشهر لصرف الرواتب', type:'number' },
}

export default function SettingsPage() {
  const { orgId, role } = useAuth()
  const supabase = createClient()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const canEdit = ['factory_manager','general_manager','super_admin'].includes(role||'')

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [sRes, oRes] = await Promise.all([
        supabase.from('system_settings').select('*').eq('organization_id', orgId).order('key'),
        supabase.from('organizations').select('*').eq('id', orgId).single(),
      ])
      const s = sRes.data||[]
      setSettings(s); setOrg(oRes.data)
      const vals: Record<string,string> = {}
      s.forEach((item: SystemSetting) => { vals[item.key] = item.value })
      setEditValues(vals)
    } catch {}
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function saveSetting(key: string) {
    if (!orgId) return
    setSaving(key)
    try {
      const existing = settings.find(s => s.key === key)
      if (existing) { await supabase.from('system_settings').update({ value: editValues[key] }).eq('id', existing.id) }
      else { await supabase.from('system_settings').insert({ organization_id: orgId, key, value: editValues[key] }) }
      setSuccess(`تم حفظ إعداد "${SETTING_META[key]?.label || key}" بنجاح`)
      load(); setTimeout(() => setSuccess(null), 3000)
    } catch {}
    finally { setSaving(null) }
  }

  const allKeys = [...new Set([...Object.keys(SETTING_META), ...settings.map(s=>s.key)])]
  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="⚙️ إعدادات النظام" subtitle="إعدادات مأخوذة من system_settings — لا hardcoded" />
      {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2 animate-fade-in"><span>✅</span>{success}</div>}
      {org && (
        <Card className="p-5 mb-6">
          <h3 className="text-white font-semibold mb-4">معلومات المصنع</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{label:'الاسم',value:org.name},{label:'الكود',value:org.code},{label:'الحالة',value:org.status},{label:'العملة',value:org.currency},{label:'المنطقة الزمنية',value:org.timezone},{label:'المدير',value:org.manager_name||'—'},{label:'الهاتف',value:org.phone||'—'},{label:'النشاط',value:org.activity_type||'—'}].map(item=>(
              <div key={item.label} className="bg-brand-surface-2 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                <p className="text-white text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card className="p-5">
        <h3 className="text-white font-semibold mb-4">إعدادات التشغيل</h3>
        <div className="space-y-4">
          {allKeys.map(key => {
            const meta = SETTING_META[key]
            const current = editValues[key]||''
            const saved = settings.find(s=>s.key===key)?.value||''
            return (
              <div key={key} className="bg-brand-surface-2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{meta?.label||key}</p>
                    {meta?.desc&&<p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{meta.desc}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input type={meta?.type||'text'} value={current} onChange={e=>setEditValues(v=>({...v,[key]:e.target.value}))} disabled={!canEdit} className="w-32 bg-brand-surface border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-brand-blue-light disabled:opacity-50 text-center" />
                    {canEdit && <Button variant="primary" size="sm" loading={saving===key} onClick={()=>saveSetting(key)} disabled={current===saved}>حفظ</Button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {!canEdit && <p className="text-gray-500 text-sm mt-4 text-center">ليس لديك صلاحية تعديل الإعدادات.</p>}
      </Card>
    </div>
  )
}
