'use client';
import { detectFaces, loadModels } from '@/lib/face-api';
import * as faceapi from 'face-api.js';
import { useEffect, useRef } from 'react';
// const prisma = new PrismaClient();

// type FaceDetectionResult = {
//   descriptor: Float32Array;
//   user?: User;
// };

export default function FaceRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

useEffect(() => {
  let videoElement: HTMLVideoElement | null = null;
  let mediaStream: MediaStream | null = null;

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStream = stream;
      videoElement = videoRef.current;
      
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  startVideo();
  loadModels().catch(console.error);

  return () => {
    // Cleanup media stream using the captured variables
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear video element reference
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };
}, []); // Empty dependency array means this runs once on mount/unmount


const handleFaceDetection = async () => {
    if (!videoRef.current) return;
    
    try {
      const detections = await detectFaces(videoRef.current);
      const canvas = canvasRef.current;
      
      if (canvas) {
        const displaySize = {
          width: videoRef.current.offsetWidth,
          height: videoRef.current.offsetHeight
        };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }
      
      // Add recognition logic here
      console.log(detections);
    } catch (error) {
      console.error('Detection error:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <video ref={videoRef} autoPlay className="w-full max-w-2xl" />
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0"
        width="1280" 
        height="720"
      />
      <button 
        className="bg-blue-500 text-white p-2 rounded mt-4"
        onClick={handleFaceDetection}
      >
        Start Recognition
      </button>
    </div>
  );
}