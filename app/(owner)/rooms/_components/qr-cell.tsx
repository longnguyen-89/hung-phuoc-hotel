"use client";

import { useState } from "react";

export function QrCell({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  return (
    <button
      onClick={() => setShow((s) => !s)}
      className="font-mono text-xs text-slate-500 hover:text-brand-600 text-left"
      title="Click để hiện/ẩn full token"
    >
      {show ? token : `${token.slice(0, 12)}…`}
    </button>
  );
}
