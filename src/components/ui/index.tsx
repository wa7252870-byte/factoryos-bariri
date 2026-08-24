'use client'
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

// Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export function Button({ variant='primary', size='md', loading, children, className='', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm:'px-3 py-1.5 text-xs', md:'px-4 py-2.5 text-sm', lg:'px-6 py-3 text-base' }
  const variants = {
    primary: 'bg-gradient-to-l from-brand-blue to-brand-blue-light text-white hover:opacity-90 shadow-lg shadow-brand-blue/20',
    secondary: 'bg-brand-surface-2 border border-gray-700 text-gray-200 hover:border-gray-500 hover:text-white',
    danger: 'bg-red-900/40 border border-red-700 text-red-300 hover:bg-red-900/60',
    gold: 'bg-gradient-to-l from-brand-gold to-brand-gold-light text-black hover:opacity-90 shadow-lg shadow-brand-gold/20',
    ghost: 'text-gray-400 hover:text-white hover:bg-brand-surface-2',
  }
  return (
    <button {...props} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  )
}

export function Input({ label, error, hint, className='', ...props }: { label?: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <input {...props} className={`w-full bg-brand-surface-2 border ${error ? 'border-red-600' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-blue-light focus:ring-1 focus:ring-brand-blue-light transition-colors ${className}`} />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-gray-500 text-xs mt-1">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, options, placeholder, className='', ...props }: { label?: string; error?: string; options: {value:string;label:string}[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
      <select {...props} className={`w-full bg-brand-surface-2 border ${error ? 'border-red-600' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue-light focus:ring-1 focus:ring-brand-blue-light transition-colors appearance-none cursor-pointer ${className}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

export function Card({ children, className='' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-brand-surface border border-gray-800 rounded-2xl ${className}`}>{children}</div>
}

type BadgeVariant = 'green'|'yellow'|'red'|'blue'|'gray'|'gold'
export function Badge({ children, variant='gray' }: { children: ReactNode; variant?: BadgeVariant }) {
  const v = {
    green: 'bg-green-900/40 text-green-400 border-green-700',
    yellow: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
    red: 'bg-red-900/40 text-red-400 border-red-700',
    blue: 'bg-blue-900/40 text-blue-400 border-blue-700',
    gray: 'bg-gray-800 text-gray-400 border-gray-700',
    gold: 'bg-yellow-900/30 text-brand-gold-light border-brand-gold',
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${v[variant]}`}>{children}</span>
}

export function LoadingSpinner({ text='جاري التحميل...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-brand-blue-light border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  )
}

export function EmptyState({ icon='💭', title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="text-gray-300 font-medium">{title}</p>
      {desc && <p className="text-gray-500 text-sm max-w-xs">{desc}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <span className="text-5xl">⚠️</span>
      <p className="text-red-300 font-medium">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>حاول مجدداً</Button>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-brand-surface border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-5 border-t border-gray-800 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon, color='blue', sub }: { label: string; value: string|number; icon: string; color?: 'blue'|'green'|'gold'|'red'; sub?: string }) {
  const colors = { blue:'from-brand-blue to-brand-blue-light', green:'from-green-700 to-green-500', gold:'from-brand-gold to-brand-gold-light', red:'from-red-800 to-red-600' }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-sm">{label}</p>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl shadow-lg`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </Card>
  )
}

export function ShiftBadge({ shift }: { shift: string }) {
  const isDay = shift?.toUpperCase().includes('DAY') || shift?.includes('نهار')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isDay ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-indigo-900/30 text-indigo-300 border-indigo-700'}`}>
      {isDay ? '☀️' : '🌙'} {isDay ? 'نهارية' : 'ليلية'}
    </span>
  )
}
