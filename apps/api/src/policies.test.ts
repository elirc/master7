import { describe, expect, it } from "vitest";
import { assertCanAccessOwnLearnerRecord, assertCanAuthorCourse, assertCanGradeLearnerWork, assertCanSubmitLearnerWork, ForbiddenError } from "./policies.js";

describe("authorization policies", () => {
  it("blocks instructors from authoring in another organization", () => {
    expect(() => assertCanAuthorCourse({ id: "i1", role: "INSTRUCTOR", organizationId: "org-a" }, "org-b")).toThrow(ForbiddenError);
  });

  it("allows instructors to grade work only in their organization", () => {
    expect(() => assertCanGradeLearnerWork({ id: "i1", role: "INSTRUCTOR", organizationId: "org-a" }, "org-a")).not.toThrow();
    expect(() => assertCanGradeLearnerWork({ id: "i1", role: "INSTRUCTOR", organizationId: "org-a" }, "org-b")).toThrow(ForbiddenError);
  });

  it("prevents learners from accessing another learner record", () => {
    expect(() => assertCanAccessOwnLearnerRecord({ id: "learner-a", role: "LEARNER", organizationId: "org-a" }, "learner-b")).toThrow(ForbiddenError);
  });

  it("allows only the owning learner to submit learning work", () => {
    expect(() => assertCanSubmitLearnerWork({ id: "learner-a", role: "LEARNER", organizationId: "org-a" }, "learner-a")).not.toThrow();
    expect(() => assertCanSubmitLearnerWork({ id: "admin-a", role: "ORG_ADMIN", organizationId: "org-a" }, "learner-a")).toThrow(ForbiddenError);
  });
});
