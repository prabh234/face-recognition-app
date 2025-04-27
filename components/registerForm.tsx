"use client"
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

// interface FaceDescriptor {
//   descriptor: Float32Array;
// }

// interface FaceRegisterProps {
//   onRegister: (descriptors: FaceDescriptor[]) => void;
// }

const FaceRegister = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load models and initialize camera
useEffect(() => {
  let stream: MediaStream | null = null;
  let interval: NodeJS.Timeout | null = null;
  let videoElement: HTMLVideoElement | null = null;

  const loadModels = async () => {
    try {
      setLoading(false)
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoElement = videoRef.current;
      if (videoElement) {
        videoElement.srcObject = stream;
        await new Promise((resolve) => {
          videoElement!.onloadedmetadata = resolve;
        });
        // Store interval reference locally
        interval = setInterval(async () => {
          // Detection logic here
        }, 100);
      }
    } catch (err) {
      setError('Error accessing camera or loading models' + err);
      setLoading(false);
    }
  };

  loadModels();

  return () => {
    // Use locally captured values for cleanup
    if (interval) clearInterval(interval);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };
}, []);

  // const startDetection = () => {
  //   intervalRef.current = setInterval(async () => {
  //     if (videoRef.current && canvasRef.current) {
  //       const detections = await faceapi
  //         .detectAllFaces(videoRef.current)
  //         .withFaceLandmarks()
  //         .withFaceDescriptors();
  //       const canvas = canvasRef.current;
  //       const displaySize = {
  //         width: videoRef.current.offsetWidth,
  //         height: videoRef.current.offsetHeight
  //       };
  //       faceapi.matchDimensions(canvas, displaySize);
  //       const resizedDetections = faceapi.resizeResults(detections, displaySize);
  //       canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  //       faceapi.draw.drawDetections(canvas, resizedDetections);
  //     }
  //   }, 100);
  // };

  const handleRegister = async () => {
    if ( !videoRef.current){console.log("runned");
     return};

    const detections = await faceapi
      .detectAllFaces(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      alert('No face detected');
      return;
    }

    const newFace: Float32Array = detections[0].descriptor;
    const data = Array.from(newFace);
    axios.post("/api/register", data).then(res => { console.log(res) }).catch(err => console.log(err));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="face-register">
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} className="max-w-2xl" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="absolute top-0 left-0" width="280" height="720" />
        <button className='z-100 relative' onClick={handleRegister}>
          Register Face
        </button>
      </div>
    </div>
  );
};

export default FaceRegister;