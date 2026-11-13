"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Last resort when the root layout itself fails; plain markup, no app styles guaranteed. */
export default function GlobalError(props: GlobalErrorProps) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 18 }}>Aplikasi gagal dimuat</h1>
          <p style={{ color: "#5c6b68", fontSize: 14 }}>Periksa koneksi internet lalu muat ulang halaman.</p>
          <button type="button" onClick={() => props.reset()} style={{ marginTop: 12, padding: "8px 14px" }}>
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
