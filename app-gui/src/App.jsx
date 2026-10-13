import React, { useState, useEffect } from "react";
import AppPC from "./AppPC";
import AppMobile from "./AppMobile";

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isAndroidApp = window.__TAURI_INTERNALS__ && ua.includes("android");
      const isMobileScreen = window.innerWidth < 768 || ua.includes("android") || ua.includes("iphone");
      
      setIsMobile(Boolean(isAndroidApp || isMobileScreen));
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile ? <AppMobile /> : <AppPC />;
}