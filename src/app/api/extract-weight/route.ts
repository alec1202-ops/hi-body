import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
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
              text: `This is a screenshot from Garmin Connect or a similar fitness/health tracking app showing body weight data.

Please extract ALL visible weight measurement data points from this image.

Return a JSON array with this exact format:
[
  { "date": "YYYY-MM-DD", "weight": 72.5 },
  ...
]

Rules:
- date must be in YYYY-MM-DD format (infer year from context if not shown; assume current year 2026 if unclear)
- weight must be a number in kg (convert from lbs if needed: 1 lb = 0.4536 kg, round to 1 decimal)
- Include only data points where you can clearly read both date and weight
- If the image shows a chart/graph, extract the visible data points as best you can
- If no weight data is visible, return an empty array []

Return ONLY the raw JSON array, no explanation, no markdown.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let entries: { date: string; weight: number }[] = [];
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
            .map((e) => ({ date: e.date, weight: Math.round(e.weight * 10) / 10 }))
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
