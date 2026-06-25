'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Webcam from 'react-webcam'
import toast from 'react-hot-toast'
import * as faceapi from 'face-api.js'
import { loadModels, getFaceDescriptor, compareFaces } from '@/lib/face/faceDetection'
import { isWithinAirport, getLocationError } from '@/lib/utils/location'

export default function AttendancePage() {
  const router = useRouter()
  const webcamRef = useRef<Webcam>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [duty, setDuty] = useState('')
  const [faceVerified, setFaceVerified] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [storedEmbedding, setStoredEmbedding] = useState<number[] | null>(null)

  useEffect(() => {
    loadModels().then(() => setModelsLoaded(true)).catch(() => toast.error('Gagal load model'))
    getLocation()
    fetchToday()
    fetchStoredEmbedding()
  }, [])

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lng: longitude })
        const err = getLocationError(latitude, longitude)
        setLocationError(err)
      },
      () => toast.error('Aktifkan GPS')
    )
  }

  const fetchToday = async () => {
    const res = await fetch('/api/attendance/today')
    if (res.ok) setTodayAttendance(await res.json())
  }

  const fetchStoredEmbedding = async () => {
    const res = await fetch('/api/face/embedding')
    if (res.ok) {
      const data = await res.json()
      if (data.embedding) setStoredEmbedding(JSON.parse(data.embedding))
    }
  }

  const captureImage = async () => {
    const src = webcamRef.current?.getScreenshot()
    if (!src) return null
    const res = await fetch(src)
    return await res.blob()
  }

  const verifyFace = async () => {
    if (!modelsLoaded) return toast.error('Model belum siap')
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return toast.error('Gagal ambil gambar')
    const img = new Image()
    img.src = imageSrc
    await new Promise(r => img.onload = r)
    const descriptor = await getFaceDescriptor(img)
    if (!descriptor) return toast.error('Wajah tidak terdeteksi')
    if (!storedEmbedding) {
      // Registrasi wajah pertama kali
      setLoading(true)
      const blob = await captureImage()
      if (!blob) return
      const formData = new FormData()
      formData.append('image', blob, 'face.jpg')
      formData.append('embedding', JSON.stringify(Array.from(descriptor)))
      const res = await fetch('/api/face/verify', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success('Wajah terdaftar!')
        setFaceVerified(true)
        setStoredEmbedding(Array.from(descriptor))
      } else toast.error('Gagal daftar wajah')
      setLoading(false)
    } else {
      // Verifikasi
      const result = compareFaces(descriptor, storedEmbedding)
      if (result.match) {
        setFaceVerified(true)
        toast.success('Wajah cocok!')
      } else {
        toast.error('Wajah tidak cocok!')
        setFaceVerified(false)
      }
    }
  }

  const handleCheckIn = async () => {
    if (!location) return toast.error('Lokasi belum siap')
    if (locationError) return toast.error(locationError)
    if (!faceVerified) return toast.error('Verifikasi wajah dulu')
    const photoBlob = await captureImage()
    if (!photoBlob) return
    const formData = new FormData()
    formData.append('photo', photoBlob, 'checkin.jpg')
    formData.append('lat', location.lat.toString())
    formData.append('lng', location.lng.toString())
    formData.append('duty', duty)
    const res = await fetch('/api/attendance/check-in', { method: 'POST', body: formData })
    if (res.ok) { toast.success('Check-in berhasil!'); fetchToday() }
    else toast.error('Check-in gagal')
  }

  const handleCheckOut = async () => {
    if (!location) return toast.error('Lokasi belum siap')
    if (locationError) return toast.error(locationError)
    if (!faceVerified) return toast.error('Verifikasi wajah dulu')
    const photoBlob = await captureImage()
    if (!photoBlob) return
    const formData = new FormData()
    formData.append('photo', photoBlob, 'checkout.jpg')
    formData.append('lat', location.lat.toString())
    formData.append('lng', location.lng.toString())
    const res = await fetch('/api/attendance/check-out', { method: 'POST', body: formData })
    if (res.ok) { toast.success('Check-out berhasil!'); fetchToday() }
    else toast.error('Check-out gagal')
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Absensi Wajah</h1>
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-lg" />
        <div className="flex gap-2 mt-2">
          <button onClick={verifyFace} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Verifikasi Wajah</button>
          <button onClick={() => setFaceVerified(false)} className="bg-gray-300 px-4 py-2 rounded">Reset</button>
        </div>
        {faceVerified && <p className="text-green-600 mt-2">✅ Wajah terverifikasi</p>}
      </div>
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <p>Lokasi: {location ? `${location.lat}, ${location.lng}` : 'Mengambil...'}</p>
        {locationError && <p className="text-red-500">{locationError}</p>}
        <input className="border rounded p-2 w-full mt-2" placeholder="Duty / Bagian" value={duty} onChange={e => setDuty(e.target.value)} />
      </div>
      <div className="flex gap-4">
        <button onClick={handleCheckIn} className="bg-green-600 text-white px-6 py-3 rounded-xl flex-1">Check-in</button>
        <button onClick={handleCheckOut} className="bg-red-600 text-white px-6 py-3 rounded-xl flex-1">Check-out</button>
      </div>
      <div className="mt-4 bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold">Status Hari Ini</h3>
        {todayAttendance ? (
          <div>
            <p>Check-in: {todayAttendance.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : '-'}</p>
            <p>Check-out: {todayAttendance.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : '-'}</p>
          </div>
        ) : <p>Belum absen</p>}
      </div>
    </div>
  )
}
