export async function openEnvironmentCamera(): Promise<MediaStream> {
  const preferredConstraints: MediaStreamConstraints = {
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } }
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints);
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}
