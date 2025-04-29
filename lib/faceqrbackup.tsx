"use client"
import { useEffect, useRef, useState,useCallback } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface FaceResult {
  name: string;
  confidence: number;
}

const FaceAndQrRecognizer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'face' | 'qr'>('qr');
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing system...');
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);
  const scannerControls = useRef<IScannerControls | null>(null);

  // Load models and face data
  useEffect(() => {
    const initializeModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        const { data } = await axios.get("/api/register");
        interface FaceData {
          id: string;
          descriptor: number[];
        }

        const labeledDescriptors = data.map((face:FaceData) =>
          new faceapi.LabeledFaceDescriptors(
            face.id.toString(),
            [new Float32Array(face.descriptor)]
          )
        );
        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors));
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setStatus('error');
        setMessage('Failed to initialize system');
      }
    };

    initializeModels();
  }, []);

  const updateFaceCanvas = (
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{
      detection: faceapi.FaceDetection;
    }, faceapi.FaceLandmarks68>> | null
  ) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (detection) {
      const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetection = faceapi.resizeResults(detection, displaySize);
      
      new faceapi.draw.DrawBox(resizedDetection.detection.box, { 
        label: faceResult ? `${faceResult.name} (${faceResult.confidence}%)` : 'Recognizing...',
        boxColor: '#00ff00',
        lineWidth: 2
      }).draw(canvas);
    }
  };

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !faceMatcher) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    updateFaceCanvas(detection || null);

    if (detection) {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      setFaceResult({
        name: bestMatch.label,
        confidence: Math.round((1 - bestMatch.distance) * 100)
      });
    } else {
      setFaceResult(null);
    }
  },[faceMatcher,updateFaceCanvas] )

  // Handle camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initializeCamera = async () => {
      try {
        if (videoRef.current) {
          const facingMode = mode === 'face' ? 'user' : 'environment';
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode }
          });

          videoRef.current.srcObject = stream;
          await new Promise(resolve => {
            videoRef.current!.onloadedmetadata = resolve;
          });

          if (mode === 'face') {
            detectionInterval.current = setInterval(detectFace, 300);
          } else {
            initializeQrScanner();
          }
        }
      } catch (err) {
        console.log(err);
        setStatus('error');
        setMessage('Camera access denied');
      }
    };

    const cleanup = () => {
      if(detectionInterval.current) clearInterval(detectionInterval.current);
      scannerControls.current?.stop();
      (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(track => track.stop());
    };

    cleanup();
    if (status === 'ready') initializeCamera();

    return () => cleanup();
  }, [mode, status,detectFace]);



  const initializeQrScanner = () => {
    if (!videoRef.current) return;

    const codeReader = new BrowserQRCodeReader();
    codeReader.decodeFromVideoElement(
      videoRef.current,
      (result, error) => {
        if (result) setQrContent(result.getText());
        else console.error(error)
      }
    ).then(controls => {
      scannerControls.current = controls;
    }).catch(console.error);
  };

  if (status === 'loading') return <div>{message}</div>;
  if (status === 'error') return <div>Error: {message}</div>;

  return (
    <div className="recognizer-container">
      <div className="mode-toggle">
        <button
          onClick={() => setMode('face')}
          className={mode === 'face' ? 'active' : ''}
        >
          Face Recognition
        </button>
        <button
          onClick={() => setMode('qr')}
          className={mode === 'qr' ? 'active' : ''}
        >
          QR Scanner
        </button>
      </div>

      <div className="video-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          style={{ transform: mode === 'face' ? 'scaleX(-1)' : 'none' }}
        />
        {mode === 'face' && (
          <canvas 
            ref={canvasRef}
            className="overlay-canvas"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
      </div>

      <div className="results-panel">
        {mode === 'face' ? (
          <div className="face-results">
            <h3>Recognition Results:</h3>
            {faceResult ? (
              <div className="result-item">
                {faceResult.name} - {faceResult.confidence}% confidence
              </div>
            ) : (
              <div className="no-result">No face detected</div>
            )}
          </div>
        ) : (
          <div className="qr-results">
            <h3>QR Code Content:</h3>
            {qrContent ? (
              <div className="qr-content">{qrContent}</div>
            ) : (
              <div className="scan-prompt">Scan QR code</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceAndQrRecognizer;