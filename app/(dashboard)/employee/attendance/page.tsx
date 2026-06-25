'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { loadModels, getFaceDescriptor, compareFaces } from '@/lib/face/faceDetection';
import { getLocationError } from '@/lib/utils/location';

export default function AttendancePage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [duty, setDuty] = useState('');
  const [faceVerified, setFaceVerified] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [storedEmbedding, setStoredEmbedding] = useState<number[] | null>(null);

  // --- Efek untuk inisialisasi ---
  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setModelsLoaded(true);
      } catch (err) {
        toast.error('Gagal memuat model face recognition');
        console.error(err);
      }
      getLocation();
      fetchToday();
      fetchStoredEmbedding();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Fungsi Lokasi ---
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        const err = getLocationError(latitude, longitude);
        setLocationError(err);
      },
      () => {
        toast.error('Aktifkan GPS untuk absensi');
        setLocationError('Gagal mendapatkan lokasi');
      },
      { enableHighAccuracy: true }
    );
  };

  // --- Fungsi API ---
  const fetchToday = async () => {
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error('Gagal ambil absensi hari ini', error);
    }
  };

  const fetchStoredEmbedding = async () => {
    try {
      const res = await fetch('/api/face/embedding');
      if (res.ok) {
        const data = await res.json();
        if (data.embedding) {
          setStoredEmbedding(JSON.parse(data.embedding));
        }
      }
    } catch (error) {
      console.error('Gagal ambil embedding', error);
    }
  };

  // --- Fungsi Kamera ---
  const captureImage = async (): Promise<Blob | null> => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Gagal mengambil gambar dari kamera');
      return null;
    }
    try {
      const res = await fetch(imageSrc);
      return await res.blob();
    } catch {
      toast.error('Gagal memproses gambar');
      return null;
    }
  };

  // --- Verifikasi Wajah ---
  const verifyFace = async () => {
    if (!modelsLoaded) {
      toast.error('Model face recognition belum siap');
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Gagal ambil gambar, periksa kamera');
      return;
    }

    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => (img.onload = resolve));

    const descriptor = await getFaceDescriptor(img);
    if (!descriptor) {
      toast.error('Wajah tidak terdeteksi, pastikan wajah terlihat jelas');
      return;
    }

    if (!storedEmbedding) {
      // Registrasi wajah pertama kali
      setLoading(true);
      const blob = await captureImage();
      if (!blob) {
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      formData.append('embedding', JSON.stringify(Array.from(descriptor)));

      try {
        const res = await fetch('/api/face/verify', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          toast.success('Wajah berhasil didaftarkan!');
          setFaceVerified(true);
          setStoredEmbedding(Array.from(descriptor));
        } else {
          toast.error(data.error || 'Gagal mendaftarkan wajah');
        }
      } catch {
        toast.error('Terjadi kesalahan saat registrasi wajah');
      }
      setLoading(false);
    } else {
      // Verifikasi wajah
      const result = await compareFaces(descriptor, storedEmbedding);
      if (result.match) {
        setFaceVerified(true);
        toast.success(`Wajah cocok! (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
      } else {
        setFaceVerified(false);
        toast.error(`Wajah tidak cocok! (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
      }
    }
  };

  // --- Check-in ---
  const handleCheckIn = async () => {
    if (!location) {
      toast.error('Lokasi belum tersedia, aktifkan GPS');
      return;
    }
    if (locationError) {
      toast.error(locationError);
      return;
    }
    if (!faceVerified) {
      toast.error('Silakan verifikasi wajah terlebih dahulu');
      return;
    }

    const photoBlob = await captureImage();
    if (!photoBlob) return;

    const formData = new FormData();
    formData.append('photo', photoBlob, 'checkin.jpg');
    formData.append('lat', location.lat.toString());
    formData.append('lng', location.lng.toString());
    formData.append('duty', duty);

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success('Check-in berhasil!');
        await fetchToday();
      } else {
        toast.error(data.error || 'Check-in gagal');
      }
    } catch {
      toast.error('Terjadi kesalahan saat check-in');
    }
    setLoading(false);
  };

  // --- Check-out ---
  const handleCheckOut = async () => {
    if (!location) {
      toast.error('Lokasi belum tersedia, aktifkan GPS');
      return;
    }
    if (locationError) {
      toast.error(locationError);
      return;
    }
    if (!faceVerified) {
      toast.error('Silakan verifikasi wajah terlebih dahulu');
      return;
    }

    const photoBlob = await captureImage();
    if (!photoBlob) return;

    const formData = new FormData();
    formData.append('photo', photoBlob, 'checkout.jpg');
    formData.append('lat', location.lat.toString());
    formData.append('lng', location.lng.toString());

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success('Check-out berhasil!');
        await fetchToday();
      } else {
        toast.error(data.error || 'Check-out gagal');
      }
    } catch {
      toast.error('Terjadi kesalahan saat check-out');
    }
    setLoading(false);
  };

  // --- Reset verifikasi ---
  const handleReset = () => {
    setFaceVerified(false);
    toast('Verifikasi wajah direset', { icon: '🔄' });
  };

  // --- JSX ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
          📸 Absensi Wajah
        </h1>

        {/* Webcam dan Verifikasi */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
              className="w-full h-full object-cover"
              mirrored
            />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
              </div>
            )}
            {faceVerified && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                ✅ Wajah Terverifikasi
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={verifyFace}
              disabled={loading || !modelsLoaded}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 flex-1 min-w-[120px]"
            >
              {loading ? 'Memproses...' : '🔍 Verifikasi Wajah'}
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition flex-1 min-w-[100px]"
            >
              ↺ Reset
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {modelsLoaded ? '✅ Model siap' : '⏳ Memuat model...'}
          </p>
        </div>

        {/* Lokasi */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">📍 Lokasi</p>
              {location ? (
                <p className="text-sm text-gray-500">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Mengambil lokasi...</p>
              )}
            </div>
            <div>
              {locationError ? (
                <span className="text-red-500 text-sm font-medium">{locationError}</span>
              ) : location ? (
                <span className="text-green-500 text-sm font-medium">✅ Dalam area bandara</span>
              ) : (
                <span className="text-yellow-500 text-sm">⏳ Mendapatkan...</span>
              )}
            </div>
          </div>
        </div>

        {/* Duty Input */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bagian / Duty
          </label>
          <input
            type="text"
            value={duty}
            onChange={(e) => setDuty(e.target.value)}
            placeholder="Contoh: Terminal 1, Check-in Counter, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Tombol Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleCheckIn}
            disabled={loading || !faceVerified || !!locationError || !location}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl shadow-lg transition text-lg"
          >
            ✅ Check-in
          </button>
          <button
            onClick={handleCheckOut}
            disabled={loading || !faceVerified || !!locationError || !location}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl shadow-lg transition text-lg"
          >
            🚪 Check-out
          </button>
        </div>

        {/* Status Hari Ini */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">📋 Status Hari Ini</h3>
          {todayAttendance ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">Check-in</span>
                <p className="font-medium">
                  {todayAttendance.checkIn
                    ? new Date(todayAttendance.checkIn).toLocaleTimeString('id-ID')
                    : '-'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">Check-out</span>
                <p className="font-medium">
                  {todayAttendance.checkOut
                    ? new Date(todayAttendance.checkOut).toLocaleTimeString('id-ID')
                    : '-'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                <span className="text-gray-500">Duty</span>
                <p className="font-medium">{todayAttendance.duty || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Belum ada absensi hari ini</p>
          )}
        </div>
      </div>
    </div>
  );
}
