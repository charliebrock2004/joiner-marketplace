/**
 * V1 job categories. Deliberately small — eight buckets a homeowner can scan
 * in a couple of seconds. The `value` is what gets stored, so treat these
 * strings as stable identifiers.
 */
export type JobCategory = {
  value: string;
  label: string;
  blurb: string;
};

export const jobCategories = [
  { value: "doors", label: "Doors", blurb: "Hanging, trimming, sticking doors and handles" },
  { value: "flooring", label: "Flooring", blurb: "Laminate, engineered wood and LVT" },
  { value: "skirting-architrave", label: "Skirting & architrave", blurb: "Fitting, replacing and making good" },
  { value: "shelving", label: "Shelving & storage", blurb: "Alcove shelves, floating shelves, cupboards" },
  { value: "flat-pack", label: "Flat-pack assembly", blurb: "Wardrobes, units and furniture built properly" },
  { value: "repairs", label: "Repairs", blurb: "Sticking windows, rotten frames, small fixes" },
  { value: "loft", label: "Attic & loft work", blurb: "Loft hatches, ladders, boarding out" },
  { value: "general", label: "General joinery", blurb: "Bespoke small jobs and anything else in timber" },
] as const satisfies readonly JobCategory[];

export const jobCategoryValues = jobCategories.map((c) => c.value);

export function categoryLabel(value: string): string {
  return jobCategories.find((c) => c.value === value)?.label ?? value;
}
