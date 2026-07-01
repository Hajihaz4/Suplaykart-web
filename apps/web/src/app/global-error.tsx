"use client";
import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(
      JSON.stringify({
        t: new Date().toISOString(),
        level: "error",
        msg: "global_error",
        digest: error.digest,
        error: error.message,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#f5f5f5",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 44 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1c1c1c" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b6b6b", marginTop: 4 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#0c831f",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "10px 22px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
