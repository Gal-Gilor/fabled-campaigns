export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/((?!auth|api/auth|_next|favicon).*)'],
};
