import { canAuthorCourse, canLearnInOrganization, canManageOrganization, type Actor } from "@lms/domain";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCanAuthorCourse(actor: Actor, organizationId: string) {
  if (!canAuthorCourse(actor, organizationId)) throw new ForbiddenError("Actor cannot author courses in this organization");
}

export function assertCanLearnInOrganization(actor: Actor, organizationId: string) {
  if (!canLearnInOrganization(actor, organizationId)) throw new ForbiddenError("Actor cannot learn in this organization");
}

export function assertCanManageOrganization(actor: Actor, organizationId: string) {
  if (!canManageOrganization(actor, organizationId)) throw new ForbiddenError("Actor cannot manage this organization");
}

export function assertCanAccessOwnLearnerRecord(actor: Actor, learnerId: string) {
  if (actor.role !== "PLATFORM_ADMIN" && actor.id !== learnerId) {
    throw new ForbiddenError("Actor cannot access another learner record");
  }
}

export function assertCanSubmitLearnerWork(actor: Actor, learnerId: string) {
  if (actor.role !== "LEARNER" || actor.id !== learnerId) {
    throw new ForbiddenError("Only the enrolled learner can submit learning work");
  }
}

export function assertCanGradeLearnerWork(actor: Actor, learnerOrganizationId: string) {
  if (actor.role === "PLATFORM_ADMIN") return;
  if ((actor.role === "INSTRUCTOR" || actor.role === "ORG_ADMIN") && actor.organizationId === learnerOrganizationId) return;
  throw new ForbiddenError("Actor cannot grade learner work for this organization");
}
