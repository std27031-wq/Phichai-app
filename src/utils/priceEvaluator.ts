import type {
  ConditionEvaluationInput,
  PriceCriterionBreakdown,
  PriceEvaluationResult,
} from '../types.ts';

export const PHYSICAL_CONDITION_OPTIONS = [
  { value: 'excellent', label: 'ดีเยี่ยม (เหมือนใหม่ ไม่มีรอยพับหรือฉีกขาด)', basePoints: 45 },
  { value: 'good', label: 'ดีมาก (ปกและสันยังแข็งแรง มุมยับเล็กน้อย)', basePoints: 36 },
  { value: 'fair', label: 'ปานกลาง (ผ่านการใช้งานปกติ มีรอยยับหรือคราบจาง)', basePoints: 26 },
  { value: 'worn', label: 'พอใช้ (ปกช้ำหรือมีรอยพับมาก แต่เนื้อหาอ่านได้ครบ)', basePoints: 16 },
] as const;

export const MARKING_LEVEL_OPTIONS = [
  { value: 'none', label: 'ไม่มีรอยขีดเขียน / ไฮไลท์ (0%)', points: 25 },
  { value: 'light', label: 'มีโน้ตหรือไฮไลท์เล็กน้อย (< 15% ของหน้า)', points: 19 },
  { value: 'moderate', label: 'มีรอยขีดเขียนและทำแบบฝึกหัดบางส่วน (15–40%)', points: 12 },
  { value: 'heavy', label: 'ทำแบบฝึกหัดหรือจดบันทึกค่อนข้างมาก (> 40%)', points: 5 },
] as const;

export const USAGE_AGE_OPTIONS = [
  { value: 'under1', label: 'ไม่เกิน 1 ปี (หลักสูตรล่าสุด)', points: 15 },
  { value: '1to2', label: '1–2 ปี', points: 12 },
  { value: '3to4', label: '3–4 ปี', points: 8 },
  { value: 'over5', label: '5 ปีขึ้นไป', points: 4 },
] as const;

/**
 * เกณฑ์ช่วยประเมินราคาหนังสือและสื่อการเรียนรู้ตามสภาพและการใช้งาน
 * ออกแบบเพื่อช่วยให้นักเรียนตั้งราคาย่อมเยาและเป็นธรรมต่อผู้ซื้อ
 */
export function evaluateResourcePrice(input: ConditionEvaluationInput): PriceEvaluationResult {
  const safeOriginal = Math.max(10, Math.round(Number(input.originalPrice) || 100));

  const physOpt =
    PHYSICAL_CONDITION_OPTIONS.find((o) => o.value === input.physicalCondition) ??
    PHYSICAL_CONDITION_OPTIONS[1];
  const markOpt =
    MARKING_LEVEL_OPTIONS.find((o) => o.value === input.markingLevel) ??
    MARKING_LEVEL_OPTIONS[1];
  const ageOpt =
    USAGE_AGE_OPTIONS.find((o) => o.value === input.usageAgeYears) ??
    USAGE_AGE_OPTIONS[1];
  const completenessPoints = input.hasCompleteness ? 15 : 5;

  const conditionScore = Math.min(
    100,
    Math.max(15, physOpt.basePoints + markOpt.points + ageOpt.points + completenessPoints)
  );

  let conditionGrade: PriceEvaluationResult['conditionGrade'] = 'C';
  let conditionLabel = 'สภาพพอใช้';

  if (conditionScore >= 88) {
    conditionGrade = 'A+';
    conditionLabel = 'สภาพดีเยี่ยม';
  } else if (conditionScore >= 72) {
    conditionGrade = 'A';
    conditionLabel = 'สภาพดีมาก';
  } else if (conditionScore >= 52) {
    conditionGrade = 'B';
    conditionLabel = 'สภาพปานกลาง';
  }

  // สำหรับชีทสรุป/ไฟล์ความรู้ ตั้งราคาย่อมเยากว่าหนังสือเล่ม (15%–50% ของราคาอ้างอิง)
  // สำหรับหนังสือเรียน/เสริมความรู้ ราคาย่อมเยาอยู่ที่ 20%–65% ของราคาปกตามคะแนนสภาพ
  const isSheetOrFile = input.kind === 'ชีทสรุป' || input.kind === 'ไฟล์ความรู้';
  const minRatio = isSheetOrFile ? 0.15 : 0.2;
  const maxRatio = isSheetOrFile ? 0.5 : 0.65;
  const targetRatio = minRatio + (conditionScore / 100) * (maxRatio - minRatio);

  const rawSuggested = safeOriginal * targetRatio;
  const suggestedPrice = Math.max(10, Math.round(rawSuggested / 5) * 5);
  const minFairPrice = Math.max(10, Math.round((suggestedPrice * 0.85) / 5) * 5);
  const maxFairPrice = Math.min(
    Math.round(safeOriginal * (isSheetOrFile ? 0.55 : 0.7)),
    Math.max(suggestedPrice + 5, Math.round((suggestedPrice * 1.15) / 5) * 5)
  );

  const discountPercent = Math.max(
    10,
    Math.min(90, Math.round(((safeOriginal - suggestedPrice) / safeOriginal) * 100))
  );

  const breakdown: PriceCriterionBreakdown[] = [
    {
      criterion: 'สภาพรูปเล่มและหน้ากระดาษ',
      impactLabel: physOpt.label.split(' (')[0],
      points: physOpt.basePoints,
    },
    {
      criterion: 'ร่องรอยการขีดเขียนและไฮไลท์',
      impactLabel: markOpt.label.split(' (')[0],
      points: markOpt.points,
    },
    {
      criterion: 'อายุการใช้งานและหลักสูตร',
      impactLabel: ageOpt.label,
      points: ageOpt.points,
    },
    {
      criterion: 'ความครบถ้วนของปก เฉลย หรือไฟล์แนบ',
      impactLabel: input.hasCompleteness ? 'ครบถ้วนสมบูรณ์' : 'ขาดบางส่วน',
      points: completenessPoints,
    },
  ];

  return {
    conditionScore,
    conditionGrade,
    conditionLabel,
    suggestedPrice,
    minFairPrice,
    maxFairPrice,
    discountPercent,
    breakdown,
  };
}
