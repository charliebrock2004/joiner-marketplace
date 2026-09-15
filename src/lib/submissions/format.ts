import { categoryLabel } from "@/lib/content/categories";
import type { SubmissionRecord } from "./types";

const LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  postcode: "Postcode",
  category: "Job type",
  description: "Description",
  budget: "Budget",
  timing: "Timing",
  preferredDate: "Preferred date",
  experienceLevel: "Experience level",
  yearsExperience: "Years experience",
  qualifications: "Qualifications (self-declared)",
  skills: "Skills",
  availability: "Availability",
  radiusMiles: "Working radius (miles)",
  profileUrl: "Profile link",
  about: "About",
  role: "Role",
};

const HIDDEN = new Set(["consent", "website"]);

function renderValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => (key === "skills" ? categoryLabel(String(v)) : String(v))).join(", ");
  }
  if (key === "category") return categoryLabel(String(value));
  if (value === "" || value === undefined || value === null) return "—";
  return String(value);
}

export function subjectFor(record: SubmissionRecord): string {
  const area = record.meta.inLaunchArea ? "" : " [outside launch area]";
  const who = String(record.data.name ?? record.data.email ?? "Unknown");
  const where = String(record.data.postcode ?? "");
  switch (record.kind) {
    case "job":
      return `New job: ${categoryLabel(String(record.data.category))} — ${where}${area}`;
    case "joiner":
      return `New joiner: ${who} — ${where}${area}`;
    default:
      return `Waitlist: ${who} — ${where}${area}`;
  }
}

/** Plain-text body. Deliberately boring and greppable. */
export function toPlainText(record: SubmissionRecord): string {
  const lines = [
    `${record.kind.toUpperCase()} submission`,
    `Reference: ${record.id}`,
    `Received: ${record.createdAt}`,
    `In launch area: ${record.meta.inLaunchArea ? "yes" : "no"}`,
    "",
  ];
  for (const [key, value] of Object.entries(record.data)) {
    if (HIDDEN.has(key)) continue;
    lines.push(`${LABELS[key] ?? key}: ${renderValue(key, value)}`);
  }
  if (record.attachments.length > 0) {
    lines.push("", `Photos attached: ${record.attachments.length}`);
  }
  return lines.join("\n");
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

export function toHtml(record: SubmissionRecord): string {
  const rows = Object.entries(record.data)
    .filter(([key]) => !HIDDEN.has(key))
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b716d;vertical-align:top;white-space:nowrap">${escapeHtml(
          LABELS[key] ?? key,
        )}</td><td style="padding:6px 0;color:#0f1311">${escapeHtml(renderValue(key, value))}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5">
<h2 style="margin:0 0 4px">${escapeHtml(subjectFor(record))}</h2>
<p style="margin:0 0 16px;color:#6b716d">Ref ${escapeHtml(record.id)} · ${escapeHtml(record.createdAt)}</p>
<table style="border-collapse:collapse">${rows}</table>
${record.attachments.length > 0 ? `<p style="margin-top:16px;color:#6b716d">${record.attachments.length} photo(s) attached.</p>` : ""}
</div>`;
}
