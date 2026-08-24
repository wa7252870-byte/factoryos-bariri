'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { AppUser, UserRole } from '@/types/database'

interface AuthState {
  user: AppUser | null
  role: UserRole | null
  orgId: string | null
  loading: boolean
  error: string | null
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null, role: null, orgId: null, loading: true, error: null
  })

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setState({ user: null, role: null, orgId: null, loading: false, error: null })
          return
        }

        const { data: appUser } = await supabase
          .from('users')
          .select('*, role:roles(*), organization:organizations(*)')
          .eq('auth_user_id', authUser.id)
          .single()

        if (appUser) {
          setState({
            user: appUser as AppUser,
            role: (appUser as any).role?.name as UserRole,
            orgId: appUser.organization_id,
            loading: false,
            error: null,
          })
          return
        }

        // تحقق من platform_staff
        const { data: staff } = await supabase
          .from('platform_staff')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .single()

        if (staff) {
          setState({
            user: { id: staff.id, full_name: staff.full_name, email: staff.email, role: { name: staff.role } } as any,
            role: staff.role as UserRole,
            orgId: null,
            loading: false,
            error: null,
          })
          return
        }

        setState({ user: null, role: null, orgId: null, loading: false, error: 'لم يُعثر على بيانات المستخدم' })
      } catch {
        setState({ user: null, role: null, orgId: null, loading: false, error: 'خطأ في تحميل بيانات المستخدم' })
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUser())
    return () => subscription.unsubscribe()
  }, [])

  return state
}

export function hasPermission(role: UserRole | null, ...allowed: UserRole[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'مشرف النظام',
  platform_owner: 'مالك المنصة',
  general_manager: 'المدير العام',
  factory_manager: 'مدير المصنع',
  finance_manager: 'مدير المالية',
  gate_1_officer: 'ضابط البوابة 1',
  gate_2_officer: 'ضابط البوابة 2',
  production_supervisor: 'مشرف الإنتاج',
  warehouse_manager: 'مدير المخزن',
}
