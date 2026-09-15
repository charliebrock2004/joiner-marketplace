import type { SVGProps } from "react";

/**
 * A deliberately tiny icon set. Line icons drawn on a 24px grid — enough for
 * this site, and far cheaper than an icon package.
 */
const paths = {
  check: "M20 6L9 17l-5-5",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  star: "M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8L12 3z",
  shield: "M12 3l7.5 3v5.5c0 4.4-3 8-7.5 9.5C7.5 19.5 4.5 15.9 4.5 11.5V6L12 3z",
  pin: "M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z",
  clock: "M12 7v5l3 2",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  filled,
  ...props
}: { name: IconName; filled?: boolean } & SVGProps<SVGSVGElement>) {
  const circle = name === "clock" || name === "pin";
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === "clock" && <circle cx="12" cy="12" r="9" />}
      {name === "pin" && <circle cx="12" cy="10" r="2.5" />}
      <path d={paths[name]} />
      {circle && null}
    </svg>
  );
}
