import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, foodName, favoriteMeals } = body;

    // If matching against a known favorite meal by name
    if (foodName && favoriteMeals?.length) {
      const lower = foodName.toLowerCase();
      const match = favoriteMeals.find((m: { name: string; aliases: string[] }) => {
        const names = [m.name, ...(m.aliases || [])].map((n: string) => n.toLowerCase());
        return names.some((n: string) => lower.includes(n) || n.includes(lower));
      });
      if (match) {
        return NextResponse.json({ matched: true, meal: match });
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const prompt = foodName
      ? `This is a photo of food. The user says it is: "${foodName}". Please analyze the food in the image and estimate nutritional information.`
      : `Please analyze the food in this image and identify what it is.`;

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
              text: `${prompt}

Please respond with a JSON object in this exact format (no markdown, just raw JSON):
{
  "name": "food name",
  "category": "solid" or "liquid" or "supplement",
  "servingSize": "estimated serving size (e.g., 1 bowl ~300g)",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "confidence": "high" or "medium" or "low",
  "notes": "any relevant notes about the estimate"
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ matched: false, result });
  } catch (err) {
    console.error('analyze-food error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
