"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { captureFrame } from "@/features/camera/hooks/useFrameCapture";
import { scanSheet } from "@/services/grading-api";
import { loadAnswerKey } from "@/stores/answer-key.store";
import { loadResults, saveResults } from "@/stores/results.store";
import type { GradingResult } from "@/types/grading-result";
import type { ScannerPhase } from "../scanner.types";

const SCAN_RETRY_MS = 1200;
const AFTER_SUCCESS_FREEZE_MS = 900;
const REMOVAL_POLL_MS = 350;
const REMOVAL_DIFF_THRESHOLD = 16;
const REMOVAL_DIFF_FRAMES = 2;
const FIRST_SCAN_DELAY_SECONDS = 5;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function isVideoReady(video: HTMLVideoElement | null): video is HTMLVideoElement {
  return Boolean(video && video.readyState >= 2 && video.videoWidth && video.videoHeight);
}

function getFrameSignature(video: HTMLVideoElement): number[] {
  const width = 24;
  const height = 18;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(video, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const signature: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    signature.push((data[index] + data[index + 1] + data[index + 2]) / 3);
  }
  return signature;
}

function signatureDistance(first: number[], second: number[]) {
  if (!first.length || first.length !== second.length) return 0;
  const total = first.reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0);
  return total / first.length;
}

function withoutAnnotatedImage(result: GradingResult): GradingResult {
  return { ...result, annotated_image: null };
}

async function waitBeforeFirstScan(setMessage: (message: string) => void, shouldContinue: () => boolean) {
  for (let second = FIRST_SCAN_DELAY_SECONDS; second > 0; second -= 1) {
    if (!shouldContinue()) return;
    setMessage(`Sẽ bắt đầu chụp bài thứ nhất sau ${second} giây. Giữ phiếu nằm trọn trong khung hình.`);
    await sleep(1000);
  }
}

export function useScanner(videoRef: RefObject<HTMLVideoElement | null>) {
  const [phase, setPhase] = useState<ScannerPhase>("idle");
  const [message, setMessage] = useState("Bấm Bắt đầu để quét và chấm tự động.");
  const [currentResult, setCurrentResult] = useState<GradingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [frozenFrameUrl, setFrozenFrameUrlState] = useState<string | null>(null);
  const runningRef = useRef(false);
  const frozenFrameUrlRef = useRef<string | null>(null);

  const setFrozenFrameUrl = useCallback((url: string | null) => {
    if (frozenFrameUrlRef.current) URL.revokeObjectURL(frozenFrameUrlRef.current);
    frozenFrameUrlRef.current = url;
    setFrozenFrameUrlState(url);
  }, []);

  const saveResult = useCallback((result: GradingResult) => {
    const results = [...loadResults(), withoutAnnotatedImage(result)];
    saveResults(results);
    setCurrentResult(result);
  }, []);

  const waitForSheetRemoval = useCallback(
    async (baseline: number[]) => {
      setPhase("waiting-removal");
      setMessage("Đã lưu kết quả. Hãy nhấc phiếu vừa chấm ra khỏi tập bài.");
      let changedFrames = 0;

      while (runningRef.current) {
        await sleep(REMOVAL_POLL_MS);
        const video = videoRef.current;
        if (!isVideoReady(video)) continue;

        const distance = signatureDistance(baseline, getFrameSignature(video));
        if (distance >= REMOVAL_DIFF_THRESHOLD) {
          changedFrames += 1;
        } else {
          changedFrames = 0;
        }

        if (changedFrames >= REMOVAL_DIFF_FRAMES) {
          setMessage("Đã phát hiện nhấc phiếu. Đang quét phiếu tiếp theo...");
          return;
        }
      }
    },
    [videoRef]
  );

  const runAutoScan = useCallback(async () => {
    await waitBeforeFirstScan(setMessage, () => runningRef.current);
    while (runningRef.current) {
      const video = videoRef.current;
      if (!isVideoReady(video)) {
        setPhase("ready");
        setMessage("Camera chưa có hình ảnh. Vui lòng chờ 1-2 giây...");
        await sleep(SCAN_RETRY_MS);
        continue;
      }

      const baseline = getFrameSignature(video);
      let previewUrl: string | null = null;
      try {
        setPhase("detecting");
        setMessage("Đang quét phiếu trong khung hình...");
        const blob = await captureFrame(video);
        previewUrl = URL.createObjectURL(blob);
        setFrozenFrameUrl(previewUrl);
        previewUrl = null;
        setPhase("grading");
        setMessage("Đã nhận ảnh. Đang chấm điểm và lưu kết quả...");
        const answerKey = loadAnswerKey();
        const result = await scanSheet(blob, answerKey);

        if (!runningRef.current) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          return;
        }

        if (result.annotated_image) {
          setFrozenFrameUrl(result.annotated_image);
        }
        setFlashKey((key) => key + 1);

        if (result.duplicate) {
          setPhase("waiting-removal");
          setMessage("Phiếu này đã được chấm trước đó. Hãy nhấc phiếu ra để quét phiếu tiếp theo.");
          await sleep(AFTER_SUCCESS_FREEZE_MS);
          await waitForSheetRemoval(baseline);
          setFrozenFrameUrl(null);
          continue;
        }

        saveResult(result);
        setPhase("saved");
        setMessage(`Đã chấm xong: ${result.score}/${result.max_score} điểm. Kết quả đã được đưa vào danh sách xuất Excel.`);
        await sleep(AFTER_SUCCESS_FREEZE_MS);
        await waitForSheetRemoval(baseline);
        setFrozenFrameUrl(null);
      } catch (error) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFrozenFrameUrl(null);
        if (!runningRef.current) return;
        setPhase("detecting");
        setMessage(error instanceof Error ? `Chưa nhận diện được phiếu: ${error.message}` : "Chưa nhận diện được phiếu. Đang thử lại...");
        await sleep(SCAN_RETRY_MS);
      }
    }
  }, [saveResult, setFrozenFrameUrl, videoRef, waitForSheetRemoval]);

  const startAutoScan = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setMessage("Bắt đầu quét tự động. Đặt phiếu đầu tiên vào khung hình.");
    void runAutoScan().finally(() => {
      runningRef.current = false;
      setIsRunning(false);
      setFrozenFrameUrl(null);
      setPhase("idle");
    });
  }, [runAutoScan, setFrozenFrameUrl]);

  const stopAutoScan = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    setFrozenFrameUrl(null);
    setPhase("idle");
    setMessage("Đã dừng quét tự động.");
  }, [setFrozenFrameUrl]);

  const scanUploadedFile = useCallback(
    async (file: File) => {
      runningRef.current = false;
      setIsRunning(false);
      const previewUrl = URL.createObjectURL(file);
      setFrozenFrameUrl(previewUrl);
      setFlashKey((key) => key + 1);
      setPhase("grading");
      setMessage(`Đã nhận file ${file.name}. Đang chấm điểm và lưu kết quả...`);

      try {
        const answerKey = loadAnswerKey();
        const result = await scanSheet(file, answerKey, file.name || "sheet.jpg");
        if (result.annotated_image) {
          setFrozenFrameUrl(result.annotated_image);
        }
        saveResult(result);
        setPhase("done");
        setMessage(`Đã chấm xong file tải lên: ${result.score}/${result.max_score} điểm. Kết quả đã được đưa vào danh sách xuất Excel.`);
      } catch (error) {
        setFrozenFrameUrl(null);
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "Không chấm được file tải lên.");
      }
    },
    [saveResult, setFrozenFrameUrl]
  );

  async function scan() {
    const video = videoRef.current;
    if (!video) {
      setPhase("error");
      setMessage("Camera chưa sẵn sàng. Vui lòng thử lại sau vài giây.");
      return;
    }
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setPhase("error");
      setMessage("Camera chưa có hình ảnh. Vui lòng chờ 1-2 giây rồi chụp lại.");
      return;
    }
    setPhase("grading");
    setMessage("Đang chụp ảnh và gửi backend chấm điểm...");
    try {
      const blob = await captureFrame(video);
      const answerKey = loadAnswerKey();
      const result = await scanSheet(blob, answerKey);
      const results = [...loadResults(), withoutAnnotatedImage(result)];
      saveResults(results);
      setCurrentResult(result);
      setPhase("done");
      setMessage("Đã chấm xong và lưu vào danh sách tạm.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Không chấm được phiếu.");
    }
  }

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (frozenFrameUrlRef.current) URL.revokeObjectURL(frozenFrameUrlRef.current);
    };
  }, []);

  return { phase, message, currentResult, flashKey, frozenFrameUrl, isRunning, scan, scanUploadedFile, startAutoScan, stopAutoScan };
}
