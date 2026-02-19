"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f9fafb",
            padding: 16,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              maxWidth: 448,
              width: "100%",
              padding: 32,
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
