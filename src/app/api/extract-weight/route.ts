import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface ExtractedEntry {
  date: string;
  weight: number;       // kg, required
  bodyFat?: number;     // %
  muscleMass?: number;  // kg
  bodyWater?: number;   // %
  boneMass?: number;    // kg
}

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: image,
              },
            },
            {
              type: 'text',
              text: `This is a screenshot from Garmin Connect or a similar fitness/health tracking app showing body composition data over time.

Please extract ALL visible body composition data points from this image.

Return a JSON array with this exact format:
[
  {
    "date": "YYYY-MM-DD",
    "weight": 72.5,
    "bodyFat": 18.5,
    "muscleMass": 32.0,
    "bodyWater": 55.0,
    "boneMass": 2.8
  },
  ...
]

Rules:
- date: YYYY-MM-DD format. Infer year from context; if unclear assume 2026.
- weight: number in kg (required). Convert from lbs if needed: 1 lb = 0.4536 kg, round to 1 decimal.
- bodyFat: body fat percentage (%). Omit field if not visible.
- muscleMass: skeletal muscle mass in kg. Omit if not visible.
- bodyWater: body water percentage (%). Omit if not visible.
- boneMass: bone mass in kg. Omit if not visible.
- Only include data points where you can clearly read the date and at least the weight.
- If the image shows a chart/graph, extract visible data points as best you can.
- If no weight data is visible, return [].

Return ONLY the raw JSON array, no explanation, no markdown code fences.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let entries: ExtractedEntry[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      entries = Array.isArray(parsed)
        ? parsed
            .filter(
              (e) =>
                e &&
                typeof e.date === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
                typeof e.weight === 'number' &&
                e.weight > 20 &&
                e.weight < 500
            )
            .map((e): ExtractedEntry => ({
              date: e.date,
              weight: Math.round(e.weight * 10) / 10,
              ...(typeof e.bodyFat === 'number' && e.bodyFat > 0 && e.bodyFat < 80
                ? { bodyFat: Math.round(e.bodyFat * 10) / 10 }
                : {}),
              ...(typeof e.muscleMass === 'number' && e.muscleMass > 0 && e.muscleMass < 200
                ? { muscleMass: Math.round(e.muscleMass * 10) / 10 }
                : {}),
              ...(typeof e.bodyWater === 'number' && e.bodyWater > 0 && e.bodyWater < 100
                ? { bodyWater: Math.round(e.bodyWater * 10) / 10 }
                : {}),
              ...(typeof e.boneMass === 'number' && e.boneMass > 0 && e.boneMass < 20
                ? { boneMass: Math.round(e.boneMass * 10) / 10 }
                : {}),
            }))
        : [];
    } catch {
      entries = [];
    }

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[extract-weight]', err);
    return NextResponse.json({ error: 'Failed to extract weight data' }, { status: 500 });
  }
}
