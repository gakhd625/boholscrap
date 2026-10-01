import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  // Suppress specific development warnings
  typescript: {
    // Allow build even with type warnings during dev
    // Remove this for production
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
