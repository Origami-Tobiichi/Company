/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*.vercel-storage.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        encoding: false,
        ...config.resolve.fallback,
      }
    }
    return config
  },
}

module.exports = nextConfig
