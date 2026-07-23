"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraControls } from "@/features/camera/components/CameraControls";
import { CameraPreview } from "@/features/camera/components/CameraPreview";
import { useCamera } from "@/features/camera/hooks/useCamera";
import { useScanner } from "../hooks/useScanner";
import { CurrentResult } from "./CurrentResult";
import { ScannerMessage } from "./ScannerMessage";
import { UploadScanFile } from "./UploadScanFile";

export function ScannerScreen() {
  const camera = useCamera();
  const scanner = useScanner(camera.videoRef);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const didAutoOpenCamera = useRef(false);
  const statusMessage = camera.stream || selectedFile || scanner.phase !== "idle" ? scanner.message : camera.message;
  const isScanning = scanner.phase === "detecting" || scanner.phase === "grading";
  const isBusy = scanner.phase === "grading" || isScanning;

  const handleStart = useCallback(async () => {
    if (selectedFile) {
      await scanner.scanUploadedFile(selectedFile);
      return;
    }
    const cameraReady = camera.stream ? true : await camera.start();
    if (!cameraReady) return;
    scanner.startAutoScan();
  }, [camera.start, camera.stream, scanner, selectedFile]);

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
          <p>Camera, ảnh hoặc PDF cần nhìn thấy đầy đủ tờ giấy. Backend sẽ kiểm tra chất lượng trước khi chấm.</p>
        </div>
        <Link className="secondary-button" href="/results">
          Xem kết quả
        </Link>
      </div>
      <div className="scanner-grid">
        <CameraPreview videoRef={camera.videoRef} flashKey={scanner.flashKey} frozenFrameUrl={scanner.frozenFrameUrl} isScanning={isScanning} />
        <div className="status-list">
          <UploadScanFile disabled={isBusy || scanner.isRunning} file={selectedFile} onChange={setSelectedFile} />
          <CameraControls isRunning={scanner.isRunning} isBusy={scanner.phase === "grading"} onStart={handleStart} onStop={scanner.stopAutoScan} />
          <ScannerMessage message={statusMessage} />
          <CurrentResult result={scanner.currentResult} />
        </div>
      </div>
    </section>
  );
}
