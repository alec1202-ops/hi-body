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

    const userHint = foodName ? `使用者說這是：「${foodName}」。` : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `請分析這張食物照片的營養成分。${userHint}

這是台灣使用者的飲食記錄，食物可能是台灣本地料理、亞洲食物、或西式料理。請根據照片中實際可見的份量估算。

請只回傳以下 JSON 格式，不要加任何說明或 markdown：
{
  "name": "食物名稱（中文）",
  "category": "solid" 或 "liquid" 或 "supplement",
  "servingSize": "估計份量（例如：1碗 約300g）",
  "calories": 熱量數字（大卡）,
  "protein": 蛋白質克數,
  "carbs": 碳水化合物克數,
  "fat": 脂肪克數,
  "confidence": "high" 或 "medium" 或 "low",
  "notes": "備註（如份量不確定請說明）"
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
