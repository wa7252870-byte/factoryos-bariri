'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, PageHeader, LoadingSpinner, EmptyState, Badge } from '@/components/ui'

const STATUS_L: Record<string,string> = { active:'نشط', expired:'منتهي', cancelled:'ملغي', trial:'تجريبي' }
const STATUS_C: Record<string,any> = { active:'green', expired:'red', cancelled:'gray', trial:'yellow' }

export default function SubscriptionsPage() {
  const supabase = createClient()
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('*, organization:organizations(*), plan:subscription_plans(*)').order('created_at', { ascending: false })
    setSubs(data||[]); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = subs.filter(s => !filterStatus || s.status === filterStatus)
  const stats = { active:subs.filter(s=>s.status==='active').length, expired:subs.filter(s=>s.status==='expired').length, trial:subs.filter(s=>s.status==='trial').length, revenue:subs.filter(s=>s.status==='active').reduce((sum,s)=>sum+(s.plan?.price||0),0) }

  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <PageHeader title="💳 الاشتراكات" subtitle={`${subs.length} اشتراك إجمالي`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[{label:'اشتراكات نشطة',value:stats.active,color:'text-green-400'},{label:'منتهية',value:stats.expired,color:'text-red-400'},{label:'تجريبية',value:stats.trial,color:'text-yellow-400'},{label:'الإيراد السنوي',value:stats.revenue.toLocaleString(),color:'text-brand-gold-light'}].map(s=>(
          <Card key={s.label} className="p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-gray-400 text-xs mt-1">{s.label}</p></Card>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['','active','trial','expired','cancelled'].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus===s?'bg-brand-blue-light text-white':'bg-brand-surface-2 text-gray-400 hover:text-white'}`}>
            {s?STATUS_L[s]:'الكل'}{s?` (${subs.filter(sub=>sub.status===s).length})`:''}
          </button>
        ))}
      </div>
      {filtered.length===0 ? <EmptyState icon="💳" title="لا توجد اشتراكات" /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs">{['المصنع','الخطة','تاريخ البدء','تاريخ الانتهاء','الحالة'].map(h=><th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(sub=>{
            const daysLeft = Math.ceil((new Date(sub.end_date).getTime()-Date.now())/86400000)
            return (<tr key={sub.id} className="border-b border-gray-800/50 hover:bg-brand-surface-2/50 transition-colors">
              <td className="px-4 py-3"><p className="text-white font-medium">{sub.organization?.name}</p><p className="text-gray-500 text-xs">{sub.organization?.code}</p></td>
              <td className="px-4 py-3"><Badge variant="blue">{sub.plan?.name}</Badge><p className="text-gray-500 text-xs mt-0.5">{sub.plan?.price?.toLocaleString()} {sub.plan?.currency}</p></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(sub.start_date).toLocaleDateString('ar-EG')}</td>
              <td className="px-4 py-3"><p className="text-gray-400 text-xs">{new Date(sub.end_date).toLocaleDateString('ar-EG')}</p>{sub.status==='active'&&<p className={`text-xs mt-0.5 ${daysLeft<30?'text-red-400':daysLeft<90?'text-yellow-400':'text-gray-500'}`}>{daysLeft>0?`${daysLeft} يوم متبقي`:'انتهى'}</p>}</td>
              <td className="px-4 py-3"><Badge variant={STATUS_C[sub.status]}>{STATUS_L[sub.status]}</Badge></td>
            </tr>)
          })}</tbody></table></div></Card>
      )}
    </div>
  )
}
