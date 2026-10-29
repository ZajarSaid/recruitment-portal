/**
 * Deterministic, simple resume quality score (1-10). Never random.
 * Based on documentable heuristics: length of resume summary, presence of
 * common sections implied by text, and basic formatting cues.
 */
export function evaluateResume(resumeSummary: string): {
  score: number;
  method: string;
  notes?: string;
} {
  const text = resumeSummary.trim();
  if (text.length === 0) {
    return {
      score: 1,
      method: "deterministic-rule-v1",
      notes: "Empty summary provided",
    };
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasBullet = text.includes("-") || text.includes("•");
  const hasEducation = /(bachelor|diploma|degree|masters|certificate|certification)/i.test(
    text,
  );
  const hasExperience = /(experience|years|worked|employed|intern)/i.test(text);
  const hasSkills = /(skills|proficient|knowledge|competencies)/i.test(text);

  let score = 5;
  if (wordCount >= 40) score += 1;
  if (wordCount >= 80) score += 1;
  if (hasBullet) score += 0.5;
  if (hasEducation) score += 1;
  if (hasExperience) score += 1;
  if (hasSkills) score += 0.5;

  const finalScore = Math.min(10, Math.max(1, Math.round(score)));
  return {
    score: finalScore,
    method: "deterministic-rule-v1",
  };
}
