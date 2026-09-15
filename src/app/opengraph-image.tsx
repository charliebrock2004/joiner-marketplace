import { ImageResponse } from "next/og";
import { site } from "@/lib/config/site";

export const alt = "Got a small joinery job? Find someone who can do it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card. This is the first thing most visitors will see, because the
 * site is promoted in local Facebook groups — so it carries the full pitch,
 * not just a logo.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf8",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#14493c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            J
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "#0f1311" }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#0f1311",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Got a small joinery job?
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#14493c",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Find someone who can do it.
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#3d4441", lineHeight: 1.35 }}>
            Connecting small jobs with local joiners who have spare capacity.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26 }}>
          <div
            style={{
              display: "flex",
              background: "#14493c",
              color: "white",
              padding: "14px 30px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            Post a job
          </div>
          <div style={{ display: "flex", color: "#6b716d" }}>
            Perth · Crieff · Auchterarder · Dunblane · Kinross
          </div>
        </div>
      </div>
    ),
    size,
  );
}
