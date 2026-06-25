/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*.vercel-storage.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    // Menangani modul 'fs' dan 'encoding' yang digunakan oleh face-api.js
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        encoding: false,
        ...config.resolve.fallback,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
