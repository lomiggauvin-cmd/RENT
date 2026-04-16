// Supabase auth removed for MVP — stubs kept so existing imports compile without changes

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = null as any;

export async function getSession() { return null; }
export async function getUser() { return null; }
export async function signInWithGoogle() { return { data: null, error: null }; }
export async function signInWithEmail(_email: string, _password: string) {
  return { data: { session: null, user: null }, error: null };
}
export async function signUpWithEmail(_email: string, _password: string) {
  return { data: { session: null, user: null }, error: null };
}
export async function signOut() { return { error: null }; }
