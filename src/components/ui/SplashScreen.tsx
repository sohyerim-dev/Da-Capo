import { useEffect, useRef, useState } from "react";
import "./SplashScreen.scss";

export default function SplashScreen() {
  const [visible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    return !sessionStorage.getItem("dacapo-splash");
  });
  const [hiding, setHiding] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem("dacapo-splash", "1");
  }, [visible]);

  const handleEnded = () => {
    setHiding(true);
    setTimeout(() => {
      setMounted(false);
    }, 3000);
  };

  if (!mounted) return null;

  return (
    <div className={`splash${hiding ? " splash--hiding" : ""}`}>
      <video
        ref={videoRef}
        className="splash__video"
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => {
          if (videoRef.current) videoRef.current.playbackRate = 2;
        }}
        onEnded={handleEnded}
      >
        <source src="/images/intro.webm" type="video/webm" />
        <source src="/images/intro.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
