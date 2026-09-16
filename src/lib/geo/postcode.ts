/**
 * UK postcode handling for location matching.
 *
 * A postcode splits into an outward code ("PH7") and an inward code ("3AB").
 * The outward code splits again into an area ("PH") and a district ("7").
 *
 * Deliberate limitation: matching is tiered by outward code and area, not by
 * true distance. Real mileage needs a postcode centroid dataset (ONS publishes
 * one) and is a follow-up — inventing coordinates would produce confidently
 * wrong matches. The tiers below never cross a postcode area, which keeps
 * results conservative and correct for a local launch.
 */

export type PostcodeParts = {
  /** Normalised, e.g. "PH7 3AB" or "PH7" when only a partial was given. */
  formatted: string;
  /** e.g. "PH7" */
  outward: string;
  /** e.g. "PH" */
  area: string;
};

const FULL_POSTCODE = /^([A-Z]{1,2}\d{1,2}[A-Z]?)(\d[A-Z]{2})$/;
const OUTWARD_ONLY = /^([A-Z]{1,2}\d{1,2}[A-Z]?)$/;

/** Parses a full or partial postcode. Returns null if it is not recognisable. */
export function parsePostcode(input: string): PostcodeParts | null {
  const normalised = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalised.length < 2) return null;

  const full = normalised.match(FULL_POSTCODE);
  if (full?.[1] && full[2]) {
    const area = full[1].match(/^[A-Z]{1,2}/)?.[0];
    if (!area) return null;
    return { formatted: `${full[1]} ${full[2]}`, outward: full[1], area };
  }

  const outwardOnly = normalised.match(OUTWARD_ONLY);
  if (outwardOnly?.[1]) {
    const area = outwardOnly[1].match(/^[A-Z]{1,2}/)?.[0];
    if (!area) return null;
    return { formatted: outwardOnly[1], outward: outwardOnly[1], area };
  }

  return null;
}

/**
 * How close two postcodes are, in the only terms we can honestly assert.
 *
 *   "same-outward" — the same postal district, always shown
 *   "same-area"    — the same postal area, shown to anyone travelling 10+ miles
 *   "far"          — a different area, never matched
 */
export type Proximity = "same-outward" | "same-area" | "far";

export function proximity(a: PostcodeParts, b: PostcodeParts): Proximity {
  if (a.outward === b.outward) return "same-outward";
  if (a.area === b.area) return "same-area";
  return "far";
}

/** The radius at which someone starts seeing the wider postal area. */
export const AREA_WIDE_RADIUS_MILES = 10;

export function isWithinRadius(
  tradesperson: PostcodeParts,
  job: PostcodeParts,
  radiusMiles: number,
): boolean {
  switch (proximity(tradesperson, job)) {
    case "same-outward":
      return true;
    case "same-area":
      return radiusMiles >= AREA_WIDE_RADIUS_MILES;
    default:
      return false;
  }
}

/** Human-readable proximity, for the marketplace listing. */
export function describeProximity(value: Proximity): string {
  switch (value) {
    case "same-outward":
      return "In your area";
    case "same-area":
      return "Nearby";
    default:
      return "Further afield";
  }
}
