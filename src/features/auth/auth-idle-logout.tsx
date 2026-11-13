"use client";

import { useEffect } from "react";
import { signOutIdle } from "./auth.actions";

type AuthIdleLogoutProps = {
  minutes: number;
};

const STORAGE_KEY = "e-clinic:last-activity";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

function readLastActivity() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(time: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // Private mode / blocked storage: the in-memory timestamp below still works for this tab.
  }
}

/**
 * Signs out after the clinic's idle timeout (shared PCs). Activity in any tab
 * counts (shared timestamp in localStorage), so an open second tab doesn't log out a busy user.
 */
export function AuthIdleLogout(props: AuthIdleLogoutProps) {
  useEffect(() => {
    const limit = props.minutes * 60_000;
    let last = Date.now();
    let signingOut = false;
    writeLastActivity(last);

    const markActive = () => {
      const now = Date.now();
      if (now - last > 5_000) {
        last = now;
        writeLastActivity(now);
      }
    };
    const check = () => {
      last = Math.max(last, readLastActivity());
      if (!signingOut && Date.now() - last >= limit) {
        signingOut = true;
        void signOutIdle();
      }
    };

    EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    const timer = setInterval(check, 15_000);
    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      clearInterval(timer);
    };
  }, [props.minutes]);

  return null;
}
