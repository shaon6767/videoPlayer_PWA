"use client";

import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div
      className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      role="status"
    >
      You&apos;re offline. Saved favorites and history are available on this device.
    </div>
  );
}
