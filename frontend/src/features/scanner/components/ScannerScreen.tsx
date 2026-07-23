"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { CameraControls } from "@/features/camera/components/CameraControls";
import { CameraPreview } from "@/features/camera/components/CameraPreview";
import { useCamera } from "@/features/camera/hooks/useCamera";
import { useScanner } from "../hooks/useScanner";
import { CurrentResult } from "./CurrentResult";
import { ScannerMessage } from "./ScannerMessage";

export function ScannerScreen() {
  const camera = useCamera();
  const scanner = useScanner(camera.videoRef);
  const didAutoOpenCamera = useRef(false);
  const statusMessage = camera.stream ? scanner.message : camera.message;

  const handleStart = useCallback(async () => {
    const cameraReady = camera.stream ? true : await camera.start();
    if (!cameraReady) return;
    scanner.startAutoScan();
  }, [camera.start, camera.stream, scanner]);

  useEffect(() => {
    if (didAutoOpenCamera.current) return;
    didAutoOpenCamera.current = true;
    void camera.start();
  }, [camera.start]);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h1>Quét phiếu trả lời</h1>
          <p>Ảnh cần nhìn thấy đầy đủ tờ giấy. Backend sẽ kiểm tra chất lượng trước khi chấm.</p>
        </div>
        <Link className="secondary-button" href="/results">
          Xem kết quả
        </Link>
      </div>
      <div className="scanner-grid">
        <CameraPreview videoRef={camera.videoRef} flashKey={scanner.flashKey} frozenFrameUrl={scanner.frozenFrameUrl} />
        <div className="status-list">
          <CameraControls isRunning={scanner.isRunning} isBusy={scanner.phase === "grading"} onStart={handleStart} onStop={scanner.stopAutoScan} />
          <ScannerMessage message={statusMessage} />
          <CurrentResult result={scanner.currentResult} />
        </div>
      </div>
    </section>
  );
}
