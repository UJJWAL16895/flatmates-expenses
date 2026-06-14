import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/register',
  },
});

// Protect all routes under /(app) which includes dashboard, groups, expenses, etc.
// Allow auth pages (login, register) and API routes to be accessed without auth
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/groups/:path*',
    '/expenses/:path*',
    '/balances/:path*',
    '/import/:path*',
    '/settlements/:path*',
  ],
};
