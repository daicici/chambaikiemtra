import { RefObject } from "react";
import { CameraOverlay } from "./CameraOverlay";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  flashKey?: number;
  frozenFrameUrl?: string | null;
};

export function CameraPreview({ videoRef, flashKey = 0, frozenFrameUrl }: Props) {
  return (
    <div className="camera-box">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(event) => {
          void event.currentTarget.play().catch(() => undefined);
        }}
      />
      {frozenFrameUrl ? <img className="camera-freeze-frame" src={frozenFrameUrl} alt="" aria-hidden="true" /> : null}
      {flashKey > 0 ? <div key={flashKey} className="camera-flash" aria-hidden="true" /> : null}
      <CameraOverlay />
    </div>
  );
}
