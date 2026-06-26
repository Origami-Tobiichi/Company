'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'EMPLOYEE'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal')
      }

      toast.success('Login berhasil!')

      const redirectPath = data.user?.role === 'ADMIN' || role === 'ADMIN'
        ? '/admin'
        : '/employee'

      router.push(redirectPath)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {role === 'ADMIN' ? 'Admin Login' : 'Employee Login'}
          </h1>
          <p className="text-gray-500 mt-2">
            Sistem Absensi Bandara I Gusti Ngurah Rai
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="email@perusahaan.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            {role === 'ADMIN' ? (
              <>
                Belum punya akun admin?{' '}
                <a href="/register?role=ADMIN" className="text-indigo-600 hover:underline">
                  Register di sini
                </a>
              </>
            ) : (
              <>
                Login sebagai{' '}
                <a href="/login?role=ADMIN" className="text-indigo-600 hover:underline">
                  Admin
                </a>
                {' '}atau{' '}
                <a href="/register?role=EMPLOYEE" className="text-indigo-600 hover:underline">
                  Register
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
