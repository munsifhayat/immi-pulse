"use client";

import { useEffect } from "react";

const APP_REFRESH_EVENT = "app:refresh";

export function dispatchAppRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_REFRESH_EVENT));
}

export function useAppRefresh(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(APP_REFRESH_EVENT, handler);
    return () => window.removeEventListener(APP_REFRESH_EVENT, handler);
  }, [callback]);
}
