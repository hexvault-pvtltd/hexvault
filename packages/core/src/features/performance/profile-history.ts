export const draftReviewEvents = ["PERFORMANCE_REVIEW_CREATED", "PERFORMANCE_REVIEW_UPDATED"];
export function canViewDraftReviews(roles: readonly string[]) {
  return roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role));
}
export function profileHistoryWhere(employeeId: string, roles: readonly string[]) {
  return { employeeId, ...(!canViewDraftReviews(roles) ? { eventType: { notIn: draftReviewEvents } } : {}) };
}
type Snapshot = Record<string, unknown>;
function snapshot(value: unknown): Snapshot {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Snapshot : {};
}
function text(value: unknown) { return typeof value === "string" ? value : ""; }
const labels: Record<string, string> = {
  CREATED: "Employee profile created", PROFILE_UPDATED: "Profile updated", SUSPENDED: "Account suspended",
  REACTIVATED: "Account reactivated", REHIRED: "Employee rehired", OFFBOARDED: "Employee offboarded",
  REPORTING_MANAGER_CHANGED: "Reporting manager changed",
  TEAM_MEMBERSHIP_UPDATED: "Team membership updated",
  PROJECT_ASSIGNED: "Added to project",
  CERTIFICATE_ISSUED: "Certificate issued", CERTIFICATE_REVOKED: "Certificate revoked",
  PERFORMANCE_REVIEW_CREATED: "Review draft created", PERFORMANCE_REVIEW_UPDATED: "Review draft updated",
  PERFORMANCE_REVIEW_PUBLISHED: "Performance review published", PERFORMANCE_GOAL_CREATED: "Goal added", PERFORMANCE_GOAL_UPDATED: "Goal updated",
};
export function describeProfileHistory(item: { eventType: string; newData: unknown }) {
  const data = snapshot(item.newData);
  const review = item.eventType.startsWith("PERFORMANCE_REVIEW_");
  const goal = item.eventType.startsWith("PERFORMANCE_GOAL_");
  const title = labels[item.eventType] ?? item.eventType.replaceAll("_", " ").toLowerCase();
  if (item.eventType.startsWith("CERTIFICATE_")) return { title, detail: text(data.title), href: typeof data.certificateId === "string" ? `/verify-certificate?id=${encodeURIComponent(data.certificateId)}` : null };
  if (review) return { title, detail: text(data.summary), href: typeof data.reviewId === "string" ? `/performance/reviews#review-${encodeURIComponent(data.reviewId)}` : null };
  if (goal) return { title, detail: [text(data.title), text(data.status), text(data.progressNote)].filter(Boolean).join(" · "), href: typeof data.goalId === "string" ? `/performance/goals#goal-${encodeURIComponent(data.goalId)}` : null };
  // History snapshots can contain sensitive internal fields. Render known
  // descriptions rather than dumping arbitrary oldData/newData as JSON.
  return { title, detail: text(data.reason), href: null };
}
