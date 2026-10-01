'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';

/**
 * Sign in with email and password.
 */
export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Invalid email or password.' };
  }

  redirect('/dashboard');
}

/**
 * Sign out the current user.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Get the current authenticated user and their profile.
 */
export async function getCurrentUser(): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    user: { id: user.id, email: user.email || '' },
    profile: profile as Profile | null,
  };
}

/**
 * Require authentication — redirect to login if not authenticated.
 * Use in server components and actions.
 */
export async function requireAuth() {
  const { user, profile } = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return { user, profile: profile! };
}
