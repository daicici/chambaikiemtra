"use client";

export function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 960;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được ảnh chụp.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Không chụp được ảnh."))), "image/jpeg", 0.9);
  });
}
