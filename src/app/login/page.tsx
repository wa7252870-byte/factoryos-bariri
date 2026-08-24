'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #0d1b3e 0%, #0a0a0a 70%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue opacity-5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold opacity-5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-28 h-28 mb-4">
            <Image
              src="https://static.wixstatic.com/media/b203e6_676489d4789b41649f7ebddc6304f997~mv2.jpg"
              alt="FactoryOS Logo"
              fill
              className="object-contain rounded-2xl shadow-2xl"
              style={{ boxShadow: '0 0 40px rgba(37,99,235,0.3)' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Factory<span className="text-brand-gold-light">OS</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">نظام إدارة المصنع المتكامل</p>
        </div>
        <div className="bg-brand-surface border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">تسجيل الدخول</h2>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="example@factory.com"
                className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue-light focus:ring-1 focus:ring-brand-blue-light transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-brand-surface-2 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-blue-light focus:ring-1 focus:ring-brand-blue-light transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: loading ? '#374151' : 'linear-gradient(135deg, #1a3a8f, #2563eb)', boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري الدخول...
                </span>
              ) : 'دخول'}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">FactoryOS Bariri &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
