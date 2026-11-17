import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) { return NextResponse.json({ data }, { status }); }
export function fail(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Request body must contain valid JSON." } }, { status: 400 });
  }
  if (error instanceof ZodError) {
    const fieldIssues = error.issues.slice(0, 4).map(issue => {
      const field = issue.path.map(part => String(part).replace(/([a-z0-9])([A-Z])/g, "$1 $2")).join(" → ");
      let detail = issue.message;
      if (issue.code === "too_small") {
        const unit = issue.origin === "string" ? " characters" : issue.origin === "array" ? " items" : "";
        detail = `must be ${issue.inclusive ? "at least" : "more than"} ${issue.minimum}${unit}`;
      } else if (issue.code === "too_big") {
        const unit = issue.origin === "string" ? " characters" : issue.origin === "array" ? " items" : "";
        detail = `must be ${issue.inclusive ? "no more than" : "less than"} ${issue.maximum}${unit}`;
      } else if (issue.code === "invalid_type" && issue.input === undefined) {
        detail = "is required";
      } else if (issue.code === "invalid_format") {
        detail = "has an invalid format";
      }
      return field ? `${field} ${detail}` : detail;
    });
    const message = fieldIssues.length
      ? `Please check ${fieldIssues.join("; ")}.`
      : "Please check the submitted fields.";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message, details: error.flatten() } }, { status: 422 });
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2002") return NextResponse.json({ error: { code: "CONFLICT", message: "A record with one of these values already exists." } }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: { code: "NOT_FOUND", message: "The requested record was not found." } }, { status: 404 });
    if (error.code === "P2003") return NextResponse.json({ error: { code: "CONFLICT", message: "This change conflicts with related records." } }, { status: 409 });
    if (error.code === "P2023") return NextResponse.json({ error: { code: "INVALID_RESOURCE_ID", message: "A resource identifier is invalid." } }, { status: 400 });
  }
  console.error("request_failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500 });
}
