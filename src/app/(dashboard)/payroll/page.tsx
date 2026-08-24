'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, PageHeader, LoadingSpinner, EmptyState, Badge, Select } from '@/components/ui'
import type { Payroll, PayrollItem, Worker, WorkerType } from '@/types/database'

type ItemWithWorker = PayrollItem & { worker: Worker & { worker_type: WorkerType } }
const STATUS_LABELS: Record<string, string> = { Draft:'مسودة', Approved:'معتمد', Paid:'مدفوع' }
const STATUS_COLORS: Record<string, 'gray'|'blue'|'green'> = { Draft:'gray', Approved:'blue', Paid:'green' }
const PAY_STATUS: Record<string, { label: string; color: 'yellow'|'green'|'red' }> = {
  Pending: { label:'معلق', color:'yellow' }, Paid: { label:'مدفوع', color:'green' }, OnHold: { label:'محجوز', color:'red' },
}

export default function PayrollPage() {
  const { orgId, role } = useAuth()
  const supabase = createClient()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [selected, setSelected] = useState<Payroll | null>(null)
  const [items, setItems] = useState<ItemWithWorker[]>([])
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const canGenerate = ['finance_manager','factory_manager','general_manager','super_admin'].includes(role||'')
  const canApprove = ['factory_manager','general_manager','super_admin'].includes(role||'')

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const [pRes, tRes] = await Promise.all([
        supabase.from('payrolls').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
        supabase.from('worker_types').select('*'),
      ])
      setPayrolls(pRes.data || [])
      setWorkerTypes(tRes.data || [])
    } catch { setError('حدث خطأ في تحميل بيانات الرواتب') }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function loadItems(payroll: Payroll) {
    setSelected(payroll); setLoadingItems(true)
    const { data } = await supabase.from('payroll_items').select('*, worker:workers(*, worker_type:worker_types(*))').eq('payroll_id', payroll.id).order('worker(full_name)')
    setItems((data as any) || [])
    setLoadingItems(false)
  }

  async function generatePayroll() {
    setGenerating(true); setError(null)
    try {
      const { error: e } = await supabase.rpc('generate_weekly_payroll')
      if (e) { setError(`خطأ في توليد الرواتب: ${e.message}`); return }
      load()
    } catch { setError('حدث خطأ أثناء توليد الرواتب') }
    finally { setGenerating(false) }
  }

  async function approvePayroll(payroll: Payroll) {
    await supabase.from('payrolls').update({ status: 'Approved' }).eq('id', payroll.id)
    load()
    if (selected?.id === payroll.id) setSelected({ ...payroll, status: 'Approved' })
  }

  const filteredItems = items.filter(item => {
    const matchType = !filterType || item.worker?.worker_type?.id === filterType
    const matchStatus = !filterStatus || item.payment_status === filterStatus
    return matchType && matchStatus
  })
  const totalAmount = filteredItems.reduce((s, i) => s + (i.final_amount || 0), 0)

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="💰 الرواتب والأجور" subtitle="إدارة كشوف الرواتب الأسبوعية"
        actions={canGenerate ? <Button variant="gold" onClick={generatePayroll} loading={generating}>توليد راتب جديد</Button> : undefined}
      />
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm flex items-center gap-2"><span>⚠️</span>{error}<button className="mr-auto" onClick={()=>setError(null)}>✕</button></div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="p-4 border-b border-gray-800"><h2 className="text-white font-semibold">كشوف الرواتب</h2></div>
          {payrolls.length === 0 ? <EmptyState icon="💰" title="لا توجد كشوف" desc="اضغط توليد راتب جديد" /> : (
            <div className="overflow-y-auto max-h-[600px]">
              {payrolls.map(p => (
                <button key={p.id} onClick={() => loadItems(p)}
                  className={`w-full text-right p-4 border-b border-gray-800/50 hover:bg-brand-surface-2 transition-colors ${selected?.id === p.id ? 'bg-brand-surface-2 border-r-2 border-r-brand-blue-light' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">#{p.payroll_number}</span>
                    <Badge variant={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  </div>
                  <p className="text-gray-400 text-xs">{new Date(p.payroll_period_start).toLocaleDateString('ar-EG',{month:'short',day:'numeric'})} — {new Date(p.payroll_period_end).toLocaleDateString('ar-EG',{month:'short',day:'numeric'})}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2 overflow-hidden">
          {!selected ? <EmptyState icon="📋" title="اختر كشف راتب لعرض التفاصيل" /> : (
            <>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-white font-semibold">كشف #{selected.payroll_number}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{new Date(selected.payroll_period_start).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'})} — {new Date(selected.payroll_period_end).toLocaleDateString('ar-EG',{weekday:'short',month:'short',day:'numeric'})}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
                  {canApprove && selected.status === 'Draft' && <Button variant="primary" size="sm" onClick={() => approvePayroll(selected)}>اعتماد الكشف</Button>}
                </div>
              </div>
              <div className="p-4 border-b border-gray-800 flex gap-3 flex-wrap items-center">
                <Select options={[{value:'',label:'كل الأنواع'},...workerTypes.map(t=>({value:t.id,label:t.name}))]} value={filterType} onChange={e=>setFilterType(e.target.value)} className="w-40" />
                <Select options={[{value:'',label:'كل الحالات'},{value:'Pending',label:'معلق'},{value:'Paid',label:'مدفوع'},{value:'OnHold',label:'محجوز'}]} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-40" />
                <div className="mr-auto text-sm text-gray-400">الإجمالي: <span className="text-brand-gold-light font-bold text-base">{totalAmount.toLocaleString('ar-EG',{minimumFractionDigits:2})}</span></div>
              </div>
              {loadingItems ? <LoadingSpinner /> : filteredItems.length === 0 ? <EmptyState icon="📋" title="لا توجد بنود" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['العامل','النوع','حضور','غياب','الأيام','الأجر','الإجمالي','الدفع'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredItems.map(item=>(
                        <tr key={item.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
                          <td className="px-4 py-3"><p className="text-white font-medium text-sm">{item.worker?.full_name}</p><p className="text-gray-500 text-xs">{item.bank_account_snapshot || 'بدون حساب'}</p></td>
                          <td className="px-4 py-3"><Badge variant="blue">{item.worker?.worker_type?.name}</Badge></td>
                          <td className="px-4 py-3 text-green-400 font-bold">{item.days_present}</td>
                          <td className="px-4 py-3 text-red-400 font-bold">{item.days_absent}</td>
                          <td className="px-4 py-3 text-gray-300">{item.days_in_period}</td>
                          <td className="px-4 py-3 text-gray-300">{item.daily_rate_snapshot?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-brand-gold-light font-bold">{item.final_amount?.toLocaleString('ar-EG',{minimumFractionDigits:2})}</td>
                          <td className="px-4 py-3"><Badge variant={PAY_STATUS[item.payment_status]?.color}>{PAY_STATUS[item.payment_status]?.label}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-gray-700 bg-brand-surface-2/50"><td colSpan={6} className="px-4 py-3 text-gray-400 text-sm font-medium">المجموع ({filteredItems.length} عامل)</td><td className="px-4 py-3 text-brand-gold-light font-bold">{totalAmount.toLocaleString('ar-EG',{minimumFractionDigits:2})}</td><td /></tr></tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
