import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, exerciseName, userWeight } = body;

    let prompt = '';

    if (imageBase64) {
      prompt = exerciseName
        ? `This is a photo of exercise data or workout. The exercise is: "${exerciseName}". Extract the exercise information.`
        : `This appears to be a photo of exercise/workout data (could be a fitness app screenshot, gym equipment display, or workout summary). Extract all exercise information visible.`;
    } else if (exerciseName) {
      prompt = `The user performed: "${exerciseName}". Estimate calorie burn based on typical values.`;
    } else {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    const userWeightContext = userWeight
      ? ` The user weighs ${userWeight}kg.`
      : '';

    const messages: Anthropic.MessageParam[] = imageBase64
      ? [
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
                text: `${prompt}${userWeightContext}

Please respond with a JSON object in this exact format (no markdown, just raw JSON):
{
  "name": "exercise name",
  "type": "cardio" or "strength" or "flexibility" or "sports" or "other",
  "duration": number (minutes),
  "caloriesBurned": number,
  "notes": "any details (sets, reps, distance, pace, HR, etc.)",
  "confidence": "high" or "medium" or "low"
}`,
              },
            ],
          },
        ]
      : [
          {
            role: 'user',
            content: `${prompt}${userWeightContext}

Please respond with a JSON object in this exact format (no markdown, just raw JSON):
{
  "name": "exercise name",
  "type": "cardio" or "strength" or "flexibility" or "sports" or "other",
  "duration": number (minutes),
  "caloriesBurned": number,
  "notes": "any details",
  "confidence": "high" or "medium" or "low"
}`,
          },
        ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('analyze-exercise error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
