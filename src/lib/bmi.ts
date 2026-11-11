export interface BmiResult {
  bmi: number
  heightCm: number
  weightKg: number
}

/**
 * BMI thuần tuý (kg / m²). Với trẻ em, con số này PHẢI được đọc cùng
 * biểu đồ BMI-for-age của WHO theo tuổi và giới tính — không dùng ngưỡng
 * BMI của người lớn để phân loại.
 */
export function calculateExactBmi(heightCm: number, weightKg: number): number | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null
  if (heightCm <= 0 || weightKg <= 0) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Number.isFinite(bmi) ? bmi : null
}

export function calculateBmi(heightCm: number, weightKg: number): BmiResult | null {
  const bmi = calculateExactBmi(heightCm, weightKg)
  if (bmi === null) return null
  return {
    bmi: Math.round(bmi * 10) / 10,
    heightCm,
    weightKg,
  }
}

export function formatBmi(bmi: number): string {
  return bmi.toFixed(1).replace('.', ',')
}

export const BMI_DISCLAIMER =
  'BMI của trẻ chỉ có ý nghĩa khi đọc theo biểu đồ tăng trưởng BMI-for-age của WHO (theo tuổi và giới tính). Đây là công cụ tham khảo, không phải chẩn đoán. Nếu bạn lo lắng về cân nặng của bé, hãy trao đổi với bác sĩ nhi.'
