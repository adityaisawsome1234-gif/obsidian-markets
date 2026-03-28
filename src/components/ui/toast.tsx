"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--s2)",
          border: "1px solid var(--brd2)",
          color: "var(--w2)",
          fontSize: "12px",
          borderRadius: "var(--rad-sm)",
        },
      }}
    />
  );
}
