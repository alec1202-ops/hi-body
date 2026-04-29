import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.');

  if (isPublic) return NextResponse.next();

  // Check for Supabase auth cookie (any cookie starting with sb- or supabase)
  const cookies = request.cookies.getAll();
  const hasAuth = cookies.some(
    (c) => c.name.startsWith('sb-') || c.name.includes('supabase')
  );

  if (!hasAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|sw\\.js$|manifest\\.json$).*)'],
};
