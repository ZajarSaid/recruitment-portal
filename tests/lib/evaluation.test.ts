import { describe, expect, it } from "vitest";

import { evaluateResume } from "@/lib/evaluation";

describe("evaluateResume", () => {
  it("is deterministic for the same input", () => {
    const summary =
      "Bachelor degree in Computer Science with 5 years of experience, " +
      "proficient in TypeScript and PostgreSQL. Skills include system design.";

    const first = evaluateResume(summary);
    const second = evaluateResume(summary);

    expect(first).toEqual(second);
    expect(first.method).toBe("deterministic-rule-v1");
  });

  it("always returns a score within the documented 1-10 range", () => {
    const samples = [
      "",
      "a",
      "short summary",
      "Diploma holder with experience",
      "Bachelor of Science with 10 years of experience. Skills: leadership, " +
        "communication, analysis, mentoring. " +
        "Worked on many projects and delivered results for many years while " +
        "leading cross functional teams across multiple regions and countries.",
    ];

    for (const sample of samples) {
      const { score } = evaluateResume(sample);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it("scores an empty summary with the documented minimum", () => {
    const result = evaluateResume("   ");
    expect(result.score).toBe(1);
    expect(result.notes).toBeDefined();
  });

  it("scores a detailed, well-structured summary higher than a sparse one", () => {
    const sparse = evaluateResume("I am a developer.");
    const detailed = evaluateResume(
      "Bachelor's degree in Computer Science. Over 8 years of experience " +
        "building software. Proficient in TypeScript, PostgreSQL and React. " +
        "Skills include cloud architecture and mentoring. " +
        "- Led a team of engineers\n- Delivered large systems",
    );

    expect(detailed.score).toBeGreaterThan(sparse.score);
  });

  it("never generates a random score on repeated calls", () => {
    const summary = "Diploma with experience and skills in accounting.";
    const scores = new Set(
      Array.from({ length: 25 }, () => evaluateResume(summary).score),
    );
    expect(scores.size).toBe(1);
  });
});
