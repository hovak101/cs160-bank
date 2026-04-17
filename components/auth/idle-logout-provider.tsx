"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const IDLE_MS = 10 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function IdleLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(WARNING_MS / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const lastResetRef = useRef<number>(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signedOutRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const signOut = useCallback(async () => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    clearTimers();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login?reason=timeout");
  }, [clearTimers, router]);

  const openWarning = useCallback(() => {
    setWarningOpen(true);
    setSecondsLeft(Math.floor(WARNING_MS / 1000));
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    logoutTimerRef.current = setTimeout(signOut, WARNING_MS);
  }, [signOut]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    warningTimerRef.current = setTimeout(openWarning, IDLE_MS - WARNING_MS);
  }, [clearTimers, openWarning]);

  const resetActivity = useCallback(() => {
    if (warningOpen) return;
    const now = Date.now();
    if (now - lastResetRef.current < ACTIVITY_THROTTLE_MS) return;
    lastResetRef.current = now;
    lastActivityRef.current = now;
    scheduleTimers();
  }, [scheduleTimers, warningOpen]);

  const staySignedIn = useCallback(() => {
    setWarningOpen(false);
    lastActivityRef.current = Date.now();
    lastResetRef.current = Date.now();
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    scheduleTimers();

    const onActivity = () => resetActivity();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_MS) {
        void signOut();
      } else if (elapsed >= IDLE_MS - WARNING_MS && !warningOpen) {
        openWarning();
      }
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimers();
    };
  }, [scheduleTimers, resetActivity, signOut, openWarning, warningOpen, clearTimers]);

  return (
    <>
      {children}
      {warningOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-warning-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-6 text-white shadow-[0_0_40px_-12px_rgba(34,211,238,0.4)]">
            <h2 id="idle-warning-title" className="text-xl font-semibold">
              Still there?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              You&apos;ll be signed out in{" "}
              <span className="font-mono text-cyan-400">{secondsLeft}</span>{" "}
              second{secondsLeft === 1 ? "" : "s"} due to inactivity.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => void signOut()}>
                Sign out now
              </Button>
              <Button onClick={staySignedIn}>Stay signed in</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
