"use client";

import { useEffect } from "react";

export function SerwistRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on insecure contexts or unsupported browsers.
    });
  }, []);
  return null;
}
