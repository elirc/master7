import type { Actor } from "@lms/domain";

export const learnerActor: Actor = { id: "user-learner", role: "LEARNER", organizationId: "org-acme" };
export const instructorActor: Actor = { id: "user-instructor", role: "INSTRUCTOR", organizationId: "org-acme" };
export const orgAdminActor: Actor = { id: "user-admin", role: "ORG_ADMIN", organizationId: "org-acme" };
export const platformAdminActor: Actor = { id: "user-platform", role: "PLATFORM_ADMIN", organizationId: null };
