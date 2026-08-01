import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.phototourl.com',
      },
    ],
    unoptimized: true,
  },

  // Allow local development origins
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.local',
  ],
};

export default nextConfig;