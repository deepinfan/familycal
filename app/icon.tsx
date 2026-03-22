import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #d9fdf7, #f4fffc)",
          borderRadius: "96px",
          color: "#0f766e"
        }}
      >
        <svg width="292" height="292" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
          <path d="M8 13h3M13 13h3M8 17h3" />
        </svg>
      </div>
    ),
    size
  );
}
