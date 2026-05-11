import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `This is a photo of a dietary supplement product or its label. Identify the supplement(s) shown.

Respond with a JSON array (no markdown, just raw JSON):
[
  {
    "name": "supplement name in Traditional Chinese when possible",
    "dose": number,
    "unit": one of ["mg", "IU", "mcg", "g", "ml", "顆", "錠", "包", "滴"],
    "notes": "optional: brand, form, or other relevant info"
  }
]

Rules:
- Use Traditional Chinese names where standard (e.g. 維生素D3, 鋅, 鎂, 葉酸, 魚油)
- Dose should be the per-serving amount shown on the label
- Pick the most appropriate unit
- If multiple distinct supplements appear, include all of them
- If you cannot identify a supplement or this is not a supplement label, return []`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ supplements: [] });
    }

    const supplements = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ supplements });
  } catch (err) {
    console.error('analyze-supplement error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
