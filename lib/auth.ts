import { createClient } from '@/lib/supabase-server'
import { User } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'

export interface AuthContext {
  supabase: SupabaseClient
  user: User
}

export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return { supabase, user }
}

export async function getOptionalUser() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}

