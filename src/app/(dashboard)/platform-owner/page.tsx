'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, PageHeader, LoadingSpinner, StatCard, Badge } from '@/components/ui'
import Image from 'next/image'
import Link from 'next/link'

export default function PlatformOwnerPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ totalOrgs:0, activeOrgs:0, totalSubs:0, openTickets:0 })
  const [recentOrgs, setRecentOrgs] = useState<any[]>([])
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [orgsRes, subsRes, ticketsRes] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at',{ascending:false}).limit(10),
        supabase.from('subscriptions').select('*, plan:subscription_plans(name, price)').eq('status','active'),
        supabase.from('support_tickets').select('*, organization:organizations(name)').in('status',['open','in_progress']).order('created_at',{ascending:false}).limit(5),
      ])
      const orgs = orgsRes.data||[]
      const subs = subsRes.data||[]
      const orgsWithSubs = orgs.map(org => ({...org, subscription: subs.find((s:any)=>s.organization_id===org.id)||null}))
      setRecentOrgs(orgsWithSubs); setRecentTickets((ticketsRes.data as any)||[])
      setStats({ totalOrgs:orgs.length, activeOrgs:orgs.filter(o=>o.status==='active').length, totalSubs:subs.length, openTickets:(ticketsRes.data||[]).length })
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  if (loading) return <div className="p-6"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-14 h-14 flex-shrink-0"><Image src="https://static.wixstatic.com/media/b203e6_676489d4789b41649f7ebddc6304f997~mv2.jpg" alt="FactoryOS" fill className="object-contain rounded-xl" style={{ boxShadow:'0 0 20px rgba(37,99,235,0.3)' }} /></div>
        <div><h1 className="text-2xl font-bold text-white">Factory<span className="text-brand-gold-light">OS</span> — لوحة المنصة</h1><p className="text-gray-400 text-sm">نظرة شاملة على المصانع والاشتراكات</p></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="إجمالي المصانع" value={stats.totalOrgs} icon="🏭" color="blue" />
        <StatCard label="المصانع النشطة" value={stats.activeOrgs} icon="✅" color="green" />
        <StatCard label="اشتراكات نشطة" value={stats.totalSubs} icon="💳" color="gold" />
        <StatCard label="تذاكر دعم مفتوحة" value={stats.openTickets} icon="🎧" color="red" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[{href:'/platform-owner/factories',label:'إدارة المصانع',icon:'🏭'},{href:'/platform-owner/subscriptions',label:'الاشتراكات',icon:'💳'},{href:'/platform-owner/plans',label:'الخطط والأسعار',icon:'📋'},{href:'/support',label:'تذاكر الدعم',icon:'🎧'},{href:'/notifications',label:'إرسال إشعارات',icon:'🔔'},{href:'/audit',label:'سجل العمليات',icon:'📋'}].map(item=>(
          <Link key={item.href} href={item.href} className="bg-brand-surface border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-brand-blue/50 hover:bg-brand-surface-2 transition-all">
            <span className="text-2xl">{item.icon}</span><span className="text-white text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between"><h3 className="text-white font-semibold">المصانع المسجلة</h3><Link href="/platform-owner/factories" className="text-brand-blue-light text-sm hover:underline">عرض الكل</Link></div>
          {recentOrgs.map(org=>(
            <div key={org.id} className="px-4 py-3 border-b border-gray-800/50 hover:bg-brand-surface-2/30 transition-colors">
              <div className="flex items-center justify-between"><div><p className="text-white text-sm font-medium">{org.name}</p><p className="text-gray-500 text-xs">{org.code} · {org.phone||'—'}</p></div><div className="flex items-center gap-2"><Badge variant={org.status==='active'?'green':'gray'}>{org.status==='active'?'نشط':org.status}</Badge>{org.subscription && <Badge variant="blue">{org.subscription.plan?.name}</Badge>}</div></div>
            </div>
          ))}
        </Card>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between"><h3 className="text-white font-semibold">تذاكر دعم تحتاج رداً</h3><Link href="/support" className="text-brand-blue-light text-sm hover:underline">فتح المحادثة</Link></div>
          {recentTickets.length===0 ? <div className="py-12 text-center text-gray-500 text-sm">لا توجد تذاكر مفتوحة</div> : recentTickets.map((t:any)=>(
            <div key={t.id} className="px-4 py-3 border-b border-gray-800/50"><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-white text-sm font-medium truncate">{t.title}</p><p className="text-gray-500 text-xs">{t.organization?.name}</p></div><Badge variant={t.priority==='urgent'||t.priority==='high'?'red':'yellow'}>{t.priority}</Badge></div></div>
          ))}
        </Card>
      </div>
    </div>
  )
}
