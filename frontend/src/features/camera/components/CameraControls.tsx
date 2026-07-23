type Props = {
  hasCamera: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onCapture: () => void;
};

export function CameraControls({ hasCamera, isBusy, onOpen, onCapture }: Props) {
  return (
    <div className="action-row">
      <button className="secondary-button" type="button" onClick={onOpen}>
        Mở camera
      </button>
      <button className="primary-button" type="button" disabled={!hasCamera || isBusy} onClick={onCapture}>
        {isBusy ? "Đang chấm..." : "Chụp và chấm"}
      </button>
    </div>
  );
}
