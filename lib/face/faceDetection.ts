// lib/face/faceDetection.ts
// Hanya dieksekusi di client-side dengan dynamic import

let faceapi: any = null;

async function loadFaceAPI() {
  if (typeof window === 'undefined') return null;
  if (!faceapi) {
    // Dynamic import hanya terjadi di client
    faceapi = await import('face-api.js');
  }
  return faceapi;
}

const MODEL_URL = '/models';

export async function loadModels() {
  const api = await loadFaceAPI();
  if (!api) return;
  await Promise.all([
    api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

export async function getFaceDescriptor(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  const api = await loadFaceAPI();
  if (!api) return null;
  const detection = await api
    .detectSingleFace(img, new api.TinyFaceDetectorOptions({ inputSize: 512 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor || null;
}

export async function compareFaces(desc1: Float32Array | number[], desc2: Float32Array | number[]) {
  const api = await loadFaceAPI();
  if (!api) return { distance: 1, match: false, confidence: 0 };
  const distance = api.euclideanDistance(desc1, desc2);
  return { distance, match: distance < 0.6, confidence: 1 - distance };
}
