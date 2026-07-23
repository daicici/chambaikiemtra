type Props = {
  isRunning: boolean;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function CameraControls({ isRunning, isBusy, onStart, onStop }: Props) {
  return (
    <div className="action-row">
      <button className="primary-button" type="button" disabled={isBusy && !isRunning} onClick={isRunning ? onStop : onStart}>
        {isRunning ? "Dừng" : "Bắt đầu"}
      </button>
    </div>
  );
}
