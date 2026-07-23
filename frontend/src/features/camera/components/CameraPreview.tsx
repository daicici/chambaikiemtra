import { RefObject } from "react";
import { CameraOverlay } from "./CameraOverlay";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function CameraPreview({ videoRef }: Props) {
  return (
    <div className="camera-box">
      <video ref={videoRef} autoPlay playsInline muted />
      <CameraOverlay />
    </div>
  );
}
