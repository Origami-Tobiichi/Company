import { Redis } from '@upstash/redis'

// Buat instance Redis dengan fallback jika env tidak tersedia
const getRedisClient = () => {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    console.warn('KV_REST_API_URL or KV_REST_API_TOKEN not set. Redis disabled.')
    return null
  }

  return new Redis({ url, token })
}

export const redis = getRedisClient()

// Export juga fungsi untuk mendapatkan instance (jika perlu)
export function getRedis() {
  return redis
}
