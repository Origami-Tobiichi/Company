import * as faceapi from 'face-api.js'

const MODEL_URL = '/models'

export async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
}

export async function getFaceDescriptor(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  return detection?.descriptor || null
}

export async function compareFaces(desc1: Float32Array | number[], desc2: Float32Array | number[]) {
  const distance = faceapi.euclideanDistance(desc1, desc2)
  return { distance, match: distance < 0.6, confidence: 1 - distance }
}
