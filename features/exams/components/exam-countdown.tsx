"use client";

import { useEffect, useRef, useState } from "react";

type ExamCountdownProps = {
  endsAt: string;
  label?: string;
  onExpire?: () => void;
};

function getRemainingMs(endsAt: string) {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function formatRemaining(ms: number | null) {
  if (ms === null) {
    return "--:--";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ExamCountdown({
  endsAt,
  label = "Time left",
  onExpire,
}: ExamCountdownProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const expireHandledRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    function tick() {
      setRemainingMs(getRemainingMs(endsAt));
    }

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [endsAt]);

  useEffect(() => {
    if (remainingMs !== 0 || expireHandledRef.current) {
      return;
    }

    expireHandledRef.current = true;
    onExpireRef.current?.();
  }, [remainingMs]);

  return (
    <div className="rounded-md border border-[#b8d3bd] bg-[#eef8f0] px-4 py-3 text-[#244c2c]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold" aria-live="polite">
        {formatRemaining(remainingMs)}
      </p>
    </div>
  );
}

