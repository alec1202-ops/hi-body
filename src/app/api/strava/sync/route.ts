import { NextRequest, NextResponse } from 'next/server';
import type { ExerciseEntry } from '@/types';

// Map Strava sport types → our exercise types
const TYPE_MAP: Record<string, ExerciseEntry['type']> = {
  Run: 'cardio', VirtualRun: 'cardio', TrailRun: 'cardio',
  Walk: 'cardio', Hike: 'cardio',
  Ride: 'cardio', VirtualRide: 'cardio', EBikeRide: 'cardio', MountainBikeRide: 'cardio', GravelRide: 'cardio',
  Swim: 'cardio', OpenWaterSwim: 'cardio',
  Rowing: 'cardio', Kayaking: 'cardio', Canoeing: 'cardio', StandUpPaddling: 'cardio',
  Elliptical: 'cardio', StairStepper: 'cardio',
  WeightTraining: 'strength', Workout: 'strength', CrossFit: 'strength',
  Yoga: 'flexibility', Pilates: 'flexibility', Stretching: 'flexibility',
  Soccer: 'sports', Football: 'sports', Tennis: 'sports', Squash: 'sports',
  Basketball: 'sports', Volleyball: 'sports', Golf: 'sports',
  Badminton: 'sports', TableTennis: 'sports', Boxing: 'sports',
  IceSkate: 'sports', AlpineSki: 'sports', NordicSki: 'sports', Snowboard: 'sports',
  Surfing: 'sports', Skateboard: 'sports',
};

async function refreshToken(refreshToken: string): Promise<{
  access_token: string; refresh_token: string; expires_at: number;
} | null> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken: storedRefresh, expiresAt, after } = await req.json() as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    after?: number; // Unix timestamp — fetch activities after this date
  };

  let currentAccessToken = accessToken;
  let newTokens: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

  // Refresh if expired (with 5-minute buffer)
  if (Date.now() / 1000 > expiresAt - 300) {
    const refreshed = await refreshToken(storedRefresh);
    if (!refreshed) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }
    currentAccessToken = refreshed.access_token;
    newTokens = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: refreshed.expires_at,
    };
  }

  // Fetch activities from Strava (max 50 per sync)
  const afterTs = after ?? Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // default: 30 days
  const params = new URLSearchParams({
    per_page: '50',
    after: String(afterTs),
  });

  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${currentAccessToken}` } }
  );

  if (!activitiesRes.ok) {
    return NextResponse.json({ error: 'fetch_failed', status: activitiesRes.status }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await activitiesRes.json();

  const entries: Omit<ExerciseEntry, 'id'>[] = raw.map((a) => {
    const sportType: string = a.sport_type ?? a.type ?? 'Workout';
    const durationMins = Math.round((a.moving_time ?? a.elapsed_time ?? 0) / 60);
    const calories = a.calories ?? 0;
    const distanceKm = a.distance ? (a.distance / 1000).toFixed(2) : null;
    const date = a.start_date_local?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    const notesParts: string[] = [];
    if (distanceKm) notesParts.push(`距離：${distanceKm} km`);
    if (a.average_heartrate) notesParts.push(`平均心率：${Math.round(a.average_heartrate)} bpm`);
    if (a.total_elevation_gain) notesParts.push(`爬升：${Math.round(a.total_elevation_gain)} m`);
    notesParts.push(`Strava ID: ${a.id}`);

    return {
      date,
      name: a.name ?? sportType,
      type: TYPE_MAP[sportType] ?? 'other',
      duration: durationMins,
      caloriesBurned: calories,
      notes: notesParts.join('　'),
      estimatedByAI: false,
      timestamp: a.start_date ?? new Date().toISOString(),
    };
  });

  return NextResponse.json({ entries, newTokens });
}
