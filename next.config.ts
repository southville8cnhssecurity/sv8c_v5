import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.phototourl.com' },
    ],
    unoptimized: true,
  },
  // Use localhost:3000 for development — no network IP needed
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.local',
  ],
};

export default nextConfig;
