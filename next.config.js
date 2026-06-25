/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ['*.vercel-storage.com'] },
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] },
}
module.exports = nextConfig
