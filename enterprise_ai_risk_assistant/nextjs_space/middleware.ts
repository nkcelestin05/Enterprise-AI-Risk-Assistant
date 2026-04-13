import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req?.nextUrl?.pathname ?? '';
      // Allow public routes
      if (path === '/login' || path === '/signup' || path?.startsWith('/api/auth') || path === '/api/signup' || path === '/api/health') {
        return true;
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/query/:path*', '/history/:path*', '/admin/:path*'],
};
