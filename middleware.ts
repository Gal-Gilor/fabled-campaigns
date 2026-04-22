export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/((?!auth|api/auth|_next|favicon).*)'],
};
