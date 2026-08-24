import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/platform-owner',
  platform_owner: '/platform-owner',
  general_manager: '/factory-manager',
  factory_manager: '/factory-manager',
  finance_manager: '/finance',
  gate_1_officer: '/gate-1',
  gate_2_officer: '/gate-2',
  production_supervisor: '/supervisor',
  warehouse_manager: '/warehouse',
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && path === '/') {
    const { data: appUser } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('auth_user_id', user.id)
      .single()

    const role = (appUser?.role as any)?.name
    const home = role ? (ROLE_HOME[role] || '/factory-manager') : '/factory-manager'
    return NextResponse.redirect(new URL(home, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images).*)'],
}
