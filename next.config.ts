import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";

const nextConfig: NextConfig = {
  // Dev logs print every Server Action's arguments: passwords, NIK, names, SOAP. Never log those.
  logging: { serverFunctions: false },
  // Uploads: logo (1 MB) and ICD-10 list (up to 4 MB), plus multipart overhead. Default is 1 MB.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
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
