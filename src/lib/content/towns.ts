/**
 * Launch coverage. We are honest about being local: these are the areas we
 * are actively building a joiner network in, everywhere else joins a list.
 *
 * `postcodeAreas` powers a soft in-area check on submitted postcodes — it
 * never blocks a submission, it only tells us (and the visitor) whether we
 * already have coverage.
 */
export const launchTowns = [
  "Perth",
  "Crieff",
  "Auchterarder",
  "Dunblane",
  "Kinross",
  "Pitlochry",
  "Blairgowrie",
  "Scone",
] as const;

/** Perthshire and immediately surrounding outward-code prefixes. */
const coveredPostcodeAreas = ["PH1", "PH2", "PH3", "PH4", "PH5", "PH6", "PH7", "PH8", "PH9", "PH10", "PH11", "PH12", "PH13", "PH14", "PH15", "PH16", "PH17", "PH18", "FK15", "KY13"];

/**
 * Returns true when a UK postcode falls inside the current launch area.
 *
 * Matching is on the outward code only, so a partial postcode ("PH7") works
 * as well as a full one ("PH7 3AB"). The inward code is stripped first,
 * because a greedy match on the whole string would read "PH73AB" as area
 * "PH73".
 */
export function isInLaunchArea(postcode: string): boolean {
  const normalised = postcode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalised.length < 2) return false;

  // A full postcode always ends with digit + two letters.
  const outward = /\d[A-Z]{2}$/.test(normalised) ? normalised.slice(0, -3) : normalised;

  const areaDigits = outward.match(/^[A-Z]{1,2}\d{1,2}/)?.[0];
  return areaDigits ? coveredPostcodeAreas.includes(areaDigits) : false;
}
