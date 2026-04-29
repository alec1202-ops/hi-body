import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { HealthReport, UserProfile, FoodEntry, ExerciseEntry, WeightEntry } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REFERENCE_RANGES = `
參考範圍（供診斷使用）：
荷爾蒙與代謝：
- 睪固酮（男）：300-1000 ng/dL；游離睪固酮：9-30 pg/mL
- TSH：0.4-4.0 mIU/L
- 游離T3：2.3-4.2 pg/mL；游離T4：0.8-1.8 ng/dL
- 皮質醇（早上8點）：6.2-19.4 μg/dL（最佳：10-18）
- 空腹胰島素：2-25 μIU/mL（最佳 <10）
- 空腹血糖：70-99 mg/dL
- HOMA-IR：<1.5最佳，1.5-2.5邊界，>2.5胰島素阻抗

營養素：
- 維生素D：30-100 ng/mL（最佳：40-60）
- 鐵蛋白（男）：30-400 ng/mL（最佳：50-200）
- 血紅素（男）：13.5-17.5 g/dL
- 維生素B12：200-900 pg/mL（最佳 >500）
- 鋅：70-120 μg/dL
- RBC鎂：4.2-6.8 mg/dL

發炎與恢復：
- hs-CRP：<1.0 mg/L 低風險，1-3 中風險，>3 高風險
- 尿酸（男）：3.4-7.0 mg/dL
- 肌酸激酶（CK）：22-198 U/L（高強度訓練後可達500-1000）

肝腎功能：
- GOT(AST)：10-40 U/L；GPT(ALT)：7-56 U/L
- 肌酸酐（男）：0.7-1.3 mg/dL；eGFR：>90 最佳，60-90 輕微下降
- 血脂：總膽固醇<200；LDL<100；HDL(男)>40（最佳>60）；三酸甘油酯<150
`;

function formatHealthReport(r: HealthReport): string {
  const fields: string[] = [`日期：${r.date}`];
  if (r.testosterone) fields.push(`睪固酮：${r.testosterone} ng/dL`);
  if (r.freeTestosterone) fields.push(`游離睪固酮：${r.freeTestosterone} pg/mL`);
  if (r.tsh) fields.push(`TSH：${r.tsh} mIU/L`);
  if (r.t3) fields.push(`游離T3：${r.t3} pg/mL`);
  if (r.t4) fields.push(`游離T4：${r.t4} ng/dL`);
  if (r.cortisol) fields.push(`皮質醇：${r.cortisol} μg/dL`);
  if (r.fastingInsulin) fields.push(`空腹胰島素：${r.fastingInsulin} μIU/mL`);
  if (r.fastingGlucose) fields.push(`空腹血糖：${r.fastingGlucose} mg/dL`);
  if (r.homaIR) fields.push(`HOMA-IR：${r.homaIR}`);
  if (r.vitaminD) fields.push(`維生素D：${r.vitaminD} ng/mL`);
  if (r.ferritin) fields.push(`鐵蛋白：${r.ferritin} ng/mL`);
  if (r.hemoglobin) fields.push(`血紅素：${r.hemoglobin} g/dL`);
  if (r.vitaminB12) fields.push(`維生素B12：${r.vitaminB12} pg/mL`);
  if (r.zinc) fields.push(`鋅：${r.zinc} μg/dL`);
  if (r.rbcMagnesium) fields.push(`RBC鎂：${r.rbcMagnesium} mg/dL`);
  if (r.hsCRP) fields.push(`hs-CRP：${r.hsCRP} mg/L`);
  if (r.uricAcid) fields.push(`尿酸：${r.uricAcid} mg/dL`);
  if (r.creatineKinase) fields.push(`肌酸激酶CK：${r.creatineKinase} U/L`);
  if (r.got) fields.push(`GOT(AST)：${r.got} U/L`);
  if (r.gpt) fields.push(`GPT(ALT)：${r.gpt} U/L`);
  if (r.creatinine) fields.push(`肌酸酐：${r.creatinine} mg/dL`);
  if (r.egfr) fields.push(`eGFR：${r.egfr} mL/min/1.73m²`);
  if (r.totalCholesterol) fields.push(`總膽固醇：${r.totalCholesterol} mg/dL`);
  if (r.ldl) fields.push(`LDL：${r.ldl} mg/dL`);
  if (r.hdl) fields.push(`HDL：${r.hdl} mg/dL`);
  if (r.triglycerides) fields.push(`三酸甘油酯：${r.triglycerides} mg/dL`);
  if (r.notes) fields.push(`備註：${r.notes}`);
  return fields.join('\n');
}

function computeFoodStats(entries: FoodEntry[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = entries.filter((e) => new Date(e.date) >= cutoff);
  if (!recent.length) return null;
  const dates = new Set(recent.map((e) => e.date));
  const n = dates.size;
  return {
    avgCalories: Math.round(recent.reduce((s, e) => s + e.nutrition.calories, 0) / n),
    avgProtein: Math.round(recent.reduce((s, e) => s + e.nutrition.protein, 0) / n),
    avgCarbs: Math.round(recent.reduce((s, e) => s + e.nutrition.carbs, 0) / n),
    avgFat: Math.round(recent.reduce((s, e) => s + e.nutrition.fat, 0) / n),
    daysLogged: n,
    totalDays: days,
  };
}

function computeExerciseStats(entries: ExerciseEntry[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = entries.filter((e) => new Date(e.date) >= cutoff);
  if (!recent.length) return null;
  const dates = new Set(recent.map((e) => e.date));
  const typeCount: Record<string, number> = {};
  recent.forEach((e) => { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });
  return {
    totalSessions: recent.length,
    daysActive: dates.size,
    avgCaloriesBurned: Math.round(recent.reduce((s, e) => s + e.caloriesBurned, 0) / recent.length),
    avgDuration: Math.round(recent.reduce((s, e) => s + e.duration, 0) / recent.length),
    typeBreakdown: typeCount,
  };
}

function computeWeightTrend(entries: WeightEntry[]) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const oldest = sorted[0];
  const weeks = (new Date(latest.date).getTime() - new Date(oldest.date).getTime()) / (7 * 86400000);
  return {
    startWeight: oldest.weight,
    currentWeight: latest.weight,
    change: Math.round((latest.weight - oldest.weight) * 10) / 10,
    weeklyRate: weeks > 0 ? Math.round((latest.weight - oldest.weight) / weeks * 100) / 100 : 0,
    latestBodyFat: latest.bodyFat,
    latestMuscleMass: latest.muscleMass,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { profile, healthReport, foodEntries, exerciseEntries, weightEntries, analysisPeriodDays = 30 } = await req.json() as {
      profile: UserProfile;
      healthReport: HealthReport;
      foodEntries: FoodEntry[];
      exerciseEntries: ExerciseEntry[];
      weightEntries: WeightEntry[];
      analysisPeriodDays?: number;
    };

    const foodStats = computeFoodStats(foodEntries, analysisPeriodDays);
    const exerciseStats = computeExerciseStats(exerciseEntries, analysisPeriodDays);
    const weightTrend = computeWeightTrend(weightEntries);

    const prompt = `你是一位專業的運動營養師暨功能醫學顧問，請根據以下完整資料，針對此人為何無法達到體重與體脂肪目標進行深入診斷分析。

${REFERENCE_RANGES}

【個人基本資料】
姓名：${profile.name || '用戶'}
年齡：${profile.age}歲
性別：${profile.gender === 'male' ? '男' : '女'}
身高：${profile.height}cm
目前體重：${profile.weight}kg
目標體重：${profile.targetWeight}kg
活動量：${profile.activityLevel}
目標：${profile.goal === 'lose' ? '減脂' : profile.goal === 'gain' ? '增肌' : '維持'}
每日熱量目標：${profile.dailyCalorieTarget} kcal
每日蛋白質目標：${profile.dailyProteinTarget}g

【年度健康檢查數據】
${formatHealthReport(healthReport)}

【近${analysisPeriodDays}天飲食統計】
${foodStats ? `
平均每日熱量：${foodStats.avgCalories} kcal
平均每日蛋白質：${foodStats.avgProtein}g
平均每日碳水：${foodStats.avgCarbs}g
平均每日脂肪：${foodStats.avgFat}g
有記錄天數：${foodStats.daysLogged}/${foodStats.totalDays}天` : '無飲食紀錄'}

【近${analysisPeriodDays}天運動統計】
${exerciseStats ? `
運動次數：${exerciseStats.totalSessions}次（${exerciseStats.daysActive}天有運動）
平均每次燃燒：${exerciseStats.avgCaloriesBurned} kcal
平均每次時長：${exerciseStats.avgDuration}分鐘
運動類型分布：${JSON.stringify(exerciseStats.typeBreakdown)}` : '無運動紀錄'}

【體重趨勢】
${weightTrend ? `
起始體重：${weightTrend.startWeight}kg → 目前：${weightTrend.currentWeight}kg
總變化：${weightTrend.change > 0 ? '+' : ''}${weightTrend.change}kg
週平均變化：${weightTrend.weeklyRate > 0 ? '+' : ''}${weightTrend.weeklyRate}kg/週
${weightTrend.latestBodyFat ? `最新體脂率：${weightTrend.latestBodyFat}%` : ''}
${weightTrend.latestMuscleMass ? `最新肌肉量：${weightTrend.latestMuscleMass}kg` : ''}` : '無體重紀錄'}

請提供以下格式的診斷報告（使用繁體中文）：

## 🔍 整體評估
（2-3句話的整體評估，說明目前進展和最主要的問題方向）

## ⚠️ 關鍵問題分析
（針對每個發現的問題，用以下格式）
### [嚴重度：高/中/低] 問題標題
問題說明：（具體說明數值偏差和對目標的影響）
根本原因：（分析可能的成因）

## 💊 具體行動建議
（至少5條具體可執行的建議，包含營養補充、生活習慣、訓練調整等）

## 📊 優先處理順序
（列出3-5個最優先需要改善的項目，說明理由）

## ⚡ 快速改善方案
（1-2個可以在本週內立即執行的行動）

請根據實際數據給出精確的分析，不要泛泛而談，直接指出數字問題。`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ diagnosis: text });

  } catch (err) {
    console.error('Diagnose error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
