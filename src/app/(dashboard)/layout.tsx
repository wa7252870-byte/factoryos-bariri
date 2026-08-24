'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth, ROLE_LABELS } from '@/hooks/useAuth'
import type { UserRole } from '@/types/database'

interface NavItem { href: string; label: string; icon: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { href:'/factory-manager', label:'لوحة التحكم', icon:'⚙️', roles:['factory_manager','general_manager','super_admin','platform_owner'] },
  { href:'/gate-1', label:'البوابة 1', icon:'🚭', roles:['gate_1_officer','factory_manager','general_manager','super_admin'] },
  { href:'/gate-2', label:'البوابة 2', icon:'✅', roles:['gate_2_officer','factory_manager','general_manager','super_admin'] },
  { href:'/workers', label:'العمال والفنيون', icon:'👷', roles:['factory_manager','general_manager','super_admin','gate_1_officer'] },
  { href:'/payroll', label:'الرواتب', icon:'💰', roles:['finance_manager','factory_manager','general_manager','super_admin'] },
  { href:'/finance', label:'المدفوعات', icon:'💳', roles:['finance_manager','factory_manager','general_manager','super_admin'] },
  { href:'/supervisor', label:'الإنتاج', icon:'🏭', roles:['production_supervisor','factory_manager','general_manager','super_admin'] },
  { href:'/warehouse', label:'المخزن', icon:'📦', roles:['warehouse_manager','factory_manager','general_manager','super_admin'] },
  { href:'/notifications', label:'الإشعارات', icon:'🔔', roles:['factory_manager','general_manager','super_admin','finance_manager','gate_1_officer','gate_2_officer','production_supervisor','warehouse_manager'] },
  { href:'/support', label:'الدعم الفني', icon:'🎧', roles:['factory_manager','general_manager','super_admin','finance_manager','gate_1_officer','gate_2_officer','production_supervisor','warehouse_manager'] },
  { href:'/reports', label:'التقارير', icon:'📊', roles:['finance_manager','factory_manager','general_manager','super_admin'] },
  { href:'/audit', label:'سجل العمليات', icon:'📋', roles:['factory_manager','general_manager','super_admin'] },
  { href:'/settings', label:'الإعدادات', icon:'⚙️', roles:['factory_manager','general_manager','super_admin'] },
  { href:'/platform-owner', label:'إدارة المنصة', icon:'🌐', roles:['platform_owner','super_admin'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return <LoadingScreen />
  if (!user || !role) return null

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-brand-dark overflow-hidden" dir="rtl">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 right-0 z-30 w-64 bg-brand-surface border-l border-gray-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="https://static.wixstatic.com/media/b203e6_676489d4789b41649f7ebddc6304f997~mv2.jpg"
              alt="FactoryOS" fill className="object-contain rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Factory<span className="text-brand-gold-light">OS</span></p>
            <p className="text-gray-500 text-xs truncate">{(user as any).organization?.name || 'المنصة'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleNav.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 ${pathname === item.href ? 'bg-brand-blue text-white font-semibold shadow-lg' : 'text-gray-400 hover:bg-brand-surface-2 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-light flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.full_name}</p>
              <p className="text-gray-500 text-xs">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-brand-surface border-b border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold text-sm">Factory<span className="text-brand-gold-light">OS</span></span>
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold">
            {user.full_name?.charAt(0) || '?'}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center gap-6">
      <div className="relative w-20 h-20">
        <Image src="https://static.wixstatic.com/media/b203e6_676489d4789b41649f7ebddc6304f997~mv2.jpg" alt="FactoryOS" fill className="object-contain rounded-2xl" />
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-brand-blue-light rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
      </div>
      <p className="text-gray-500 text-sm">جاري التحميل...</p>
    </div>
  )
}
