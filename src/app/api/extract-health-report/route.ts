import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `請從這份健康檢查報告中，找出以下指標的數值，並以 JSON 格式回傳。
只回傳有找到的數值，找不到的欄位請省略（不要回傳 null）。
數值只需要數字，不需要單位。

需要提取的欄位：
- testosterone（睪固酮 ng/dL）
- freeTestosterone（游離睪固酮 pg/mL）
- tsh（TSH mIU/L）
- t3（游離T3 或 FT3 pg/mL）
- t4（游離T4 或 FT4 ng/dL）
- cortisol（皮質醇 μg/dL）
- fastingInsulin（空腹胰島素 μIU/mL）
- fastingGlucose（空腹血糖 mg/dL）
- homaIR（HOMA-IR）
- vitaminD（維生素D 或 25-OH Vitamin D ng/mL）
- ferritin（鐵蛋白 ng/mL）
- hemoglobin（血紅素 或 Hgb g/dL）
- vitaminB12（維生素B12 pg/mL）
- zinc（鋅 μg/dL）
- rbcMagnesium（RBC鎂 mg/dL）
- hsCRP（高敏感性CRP 或 hs-CRP mg/L）
- uricAcid（尿酸 mg/dL）
- creatineKinase（肌酸激酶 或 CK U/L）
- got（GOT 或 AST U/L）
- gpt（GPT 或 ALT U/L）
- creatinine（肌酸酐 mg/dL）
- egfr（eGFR mL/min）
- totalCholesterol（總膽固醇 mg/dL）
- ldl（LDL mg/dL）
- hdl（HDL mg/dL）
- triglycerides（三酸甘油酯 mg/dL）

請直接回傳 JSON，不要有其他文字。例如：
{"fastingGlucose": 95, "totalCholesterol": 185, "ldl": 110, "hdl": 55, "triglycerides": 120}`;

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json() as { base64: string; mimeType: string };

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type ValidImageType = typeof validImageTypes[number];

    // Build content based on file type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let content: any[];
    if (mimeType === 'application/pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: EXTRACTION_PROMPT },
      ];
    } else {
      const imgType: ValidImageType = (validImageTypes as readonly string[]).includes(mimeType)
        ? mimeType as ValidImageType
        : 'image/jpeg';
      content = [
        { type: 'image', source: { type: 'base64', media_type: imgType, data: base64 } },
        { type: 'text', text: EXTRACTION_PROMPT },
      ];
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: '無法從文件中識別數據' }, { status: 400 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    // Ensure all values are numbers
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(extracted)) {
      const num = parseFloat(String(v));
      if (!isNaN(num)) cleaned[k] = num;
    }

    return NextResponse.json({ values: cleaned, count: Object.keys(cleaned).length });

  } catch (err) {
    console.error('Extract error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
