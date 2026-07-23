"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openEnvironmentCamera } from "../services/camera.service";

async function attachStream(video: HTMLVideoElement | null, stream: MediaStream) {
  if (!video) return;
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => undefined);
}

function getCameraErrorMessage(error: unknown) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera chỉ hoạt động trên HTTPS. Hãy mở website bằng link Render hoặc ngrok HTTPS.";
  }
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Trình duyệt đang chặn camera. Vui lòng cấp quyền camera rồi thử lại.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Không tìm thấy camera trên thiết bị.";
  }
  return "Không mở được camera. Vui lòng thử lại bằng Safari hoặc Chrome.";
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState("Camera chưa mở.");

  const start = useCallback(async (): Promise<boolean> => {
    if (stream) {
      await attachStream(videoRef.current, stream);
      setMessage("Camera đã sẵn sàng.");
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Trình duyệt này không hỗ trợ mở camera trực tiếp.");
      return false;
    }

    try {
      const nextStream = await openEnvironmentCamera();
      setStream(nextStream);
      await attachStream(videoRef.current, nextStream);
      setMessage("Camera đã sẵn sàng.");
      return true;
    } catch (error) {
      setMessage(getCameraErrorMessage(error));
      return false;
    }
  }, [stream]);

  const stop = useCallback(() => {
    setStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  useEffect(() => {
    if (stream) void attachStream(videoRef.current, stream);
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return { videoRef, stream, message, start, stop };
}
