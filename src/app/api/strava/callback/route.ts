import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/exercise?strava_error=${error || 'no_code'}`);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/exercise?strava_error=not_configured`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/exercise?strava_error=token_exchange_failed`);
  }

  const data = await tokenRes.json();

  // Pass tokens to client via URL params (personal app – acceptable tradeoff)
  const params = new URLSearchParams({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_expires_at: String(data.expires_at),
    strava_athlete_name: `${data.athlete?.firstname ?? ''} ${data.athlete?.lastname ?? ''}`.trim(),
    strava_athlete_id: String(data.athlete?.id ?? ''),
  });

  return NextResponse.redirect(`${baseUrl}/exercise?${params.toString()}`);
}
