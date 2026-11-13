import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";

const nextConfig: NextConfig = {
  // Dev logs print every Server Action's arguments: passwords, NIK, names, SOAP. Never log those.
  logging: { serverFunctions: false },
  // Uploads: logo (1 MB) and ICD-10 list (up to 4 MB), plus multipart overhead. Default is 1 MB.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Client router cache: a page visited (dynamic) or warmed on hover (static = full prefetch) is reused
    // for 30 s, so going back to a tab is instant. Every mutation calls router.refresh(), which clears it,
    // and live screens (queue, cashier, pharmacy) refresh themselves on Realtime events.
    staleTimes: { dynamic: 30, static: 30 },
  },
  // Clinic logo: signed URLs from the private Storage bucket.
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/sign/**" }] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
