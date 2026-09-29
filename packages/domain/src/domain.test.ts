import { describe, expect, it } from "vitest";
import { canAuthorCourse, gradeQuiz, issueCertificateInput, publishDraft } from "./index.js";

describe("domain rules", () => {
  it("allows instructors to author only inside their organization", () => {
    expect(canAuthorCourse({ id: "u1", role: "INSTRUCTOR", organizationId: "org-a" }, "org-a")).toBe(true);
    expect(canAuthorCourse({ id: "u1", role: "INSTRUCTOR", organizationId: "org-a" }, "org-b")).toBe(false);
  });

  it("prevents publishing already published drafts", () => {
    expect(publishDraft("DRAFT")).toBe("PUBLISHED");
    expect(() => publishDraft("PUBLISHED")).toThrow(/Cannot publish/);
  });

  it("grades quizzes with explicit pass/fail state", () => {
    expect(gradeQuiz(85, 80)).toEqual({ score: 85, passed: true, status: "GRADED" });
  });

  it("issues certificates only after all durable completion records are satisfied", () => {
    expect(
      issueCertificateInput({
        enrollmentStatus: "COMPLETED",
        completedLessons: 4,
        totalLessons: 4,
        requiredQuizPassed: true,
        requiredAssignmentPassed: true
      })
    ).toBe("ISSUED");
  });
});
