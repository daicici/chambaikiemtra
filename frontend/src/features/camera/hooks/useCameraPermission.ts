"use client";

import { useEffect, useState } from "react";

export function useCameraPermission() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  return { supported };
}
