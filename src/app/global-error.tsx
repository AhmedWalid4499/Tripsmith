"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the whole document,
// so it brings its own <html>/<body> and inline styles (globals.css may not have loaded).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#fbf8f2",
          color: "#1c2434",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{ maxWidth: 480, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}
        >
          <h1 style={{ fontSize: 28, margin: 0 }}>Tripsmith is having a moment</h1>
          <p style={{ color: "#5b6270", lineHeight: 1.5 }}>
            Something went wrong loading the page. Please try again in a few seconds.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 8,
              border: 0,
              background: "#0e5e5e",
              color: "#fff",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
