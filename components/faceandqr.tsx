"use client"
import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface FaceResult {
  name: string;
  confidence: number;
}
interface Face {
  id:string,
  descriptor:number[]
}
const FaceAndQrRecognizer = ({ eventid }: { eventid: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'face' | 'qr'>('face');
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load models and initialize face matcher
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        const { data } = await axios.get("/api/register");
        const labeledDescriptors = data.map((face: Face) =>
          new faceapi.LabeledFaceDescriptors(
            `user_${face.id}`,
            [new Float32Array(face.descriptor)]
          )
        );
        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to initialize system');
        setLoading(false);
      }
    };
    initialize();
  }, [eventid]);

  // Face detection and canvas update
  const updateFaceCanvas = useCallback((
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{
      detection: faceapi.FaceDetection;
    }, faceapi.FaceLandmarks68>> | null,
    result?: FaceResult
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
        label: result ? `${result.name} (${result.confidence}%)` : 'Recognizing...',
        boxColor: '#00ff00',
        lineWidth: 2
      }).draw(canvas);
    }
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !faceMatcher) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      const result = {
        name: bestMatch.label,
        confidence: Math.round((1 - bestMatch.distance) * 100)
      };
      updateFaceCanvas(detection, result);
      setFaceResult(result);
    } else {
      updateFaceCanvas(null);
      setFaceResult(null);
    }
  }, [faceMatcher, updateFaceCanvas]);

  // Handle mode changes and camera stream
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const facingMode = mode === 'face' ? 'user' : 'environment';
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        });

        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        if (mode === 'face') {
          detectionInterval.current = setInterval(detectFace, 300);
        } else {
          const codeReader = new BrowserQRCodeReader();
          if (videoRef.current) {
            codeReader.decodeFromVideoElement(videoRef.current, (result) => {
              if (result) setQrContent(result.getText());
            }).then(controls => {
              scannerControls.current = controls;
            });
          }
        }
      } catch (err) {
        console.error(err);
        setError('Camera access denied');
      }
    };

    const cleanup = () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      scannerControls.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };

    cleanup();
    if (!loading && !error) initializeCamera();

    return () => cleanup();
  }, [mode, loading, error, detectFace]);

  if (loading) return <div>Loading recognition system...</div>;
  if (error) return <div>Error: {error}</div>;

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