"use client";

import { useEffect, useRef, useState } from "react";
import { openEnvironmentCamera } from "../services/camera.service";

async function attachStream(video: HTMLVideoElement | null, stream: MediaStream) {
  if (!video) return;
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => undefined);
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState("Camera chưa mở.");

  async function start() {
    try {
      const nextStream = await openEnvironmentCamera();
      setStream(nextStream);
      await attachStream(videoRef.current, nextStream);
      setMessage("Camera đã sẵn sàng.");
    } catch {
      setMessage("Không mở được camera. Vui lòng cấp quyền camera.");
    }
  }

  function stop() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  useEffect(() => {
    if (stream) void attachStream(videoRef.current, stream);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  return { videoRef, stream, message, start, stop };
}
