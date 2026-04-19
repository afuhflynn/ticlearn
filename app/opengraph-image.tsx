import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TiCLearn - AI-Powered Study Platform for GCE A-Level Cameroon";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <span
          style={{
            fontSize: "80px",
            color: "#ffffff",
          }}
        >
          📚
        </span>
        <span
          style={{
            fontSize: "100px",
            fontWeight: 800,
            color: "#38bdf8",
          }}
        >
          TiCLearn
        </span>
      </div>
      <p
        style={{
          fontSize: "32px",
          color: "#94a3b8",
          margin: 0,
        }}
      >
        AI-Powered Study Platform
      </p>
      <p
        style={{
          fontSize: "24px",
          color: "#64748b",
          marginTop: "20px",
        }}
      >
        For GCE A-Level Students in Cameroon
      </p>
    </div>,
    {
      ...size,
    }
  );
}
