import { cookies } from 'next/headers';

export function getSessionId(): string | null {
  const cookieStore = cookies();
  const secure = cookieStore.get('__Secure-next-auth.session-token')?.value;
  const unsecure = cookieStore.get('next-auth.session-token')?.value;
  return secure || unsecure || null;
}


