"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type GPS = { lat: number; lng: number } | null;

export function ScanClient({
  taskId,
  roomName,
  roomQrToken,
}: {
  taskId: string;
  roomName: string;
  roomQrToken: string;
}) {
  const router = useRouter();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [gps, setGps] = useState<GPS>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");

  // Start QR scanner
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            setQr(decoded);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err) {
        setScanError(err instanceof Error ? err.message : "Không mở được camera");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && s.getState?.() === 2) s.stop().catch(() => {});
    };
  }, []);

  // Get GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const qrMatches = qr != null && qr === roomQrToken;

  async function handleCheckIn() {
    if (!qr || !gps) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: qr, gps_lat: gps.lat, gps_lng: gps.lng }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error ?? "Check-in thất bại");
        return;
      }
      router.push(`/cleaner/tasks/${taskId}/active`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Link href={`/cleaner/tasks/${taskId}`} className="text-sm text-slate-500">← Quay lại</Link>

      <div>
        <div className="text-lg font-semibold text-slate-800">{roomName}</div>
        <div className="text-sm text-slate-500">Quét mã QR ở cửa phòng để check-in</div>
      </div>

      <div className="card p-3">
        <div id="qr-reader" className="w-full aspect-square bg-black rounded overflow-hidden" />
        {scanError && (
          <div className="text-xs text-red-600 mt-2">
            Không bật được camera: {scanError}. Nhập mã QR thủ công bên dưới.
          </div>
        )}

        <details className="mt-3 text-sm">
          <summary className="text-brand-600 cursor-pointer">Nhập mã QR thủ công</summary>
          <div className="mt-2 flex gap-2">
            <input
              className="input"
              placeholder="Dán mã QR ở đây"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setQr(manualToken.trim())}
              className="btn bg-slate-200 text-slate-700 hover:bg-slate-300 h-9 px-3"
            >
              OK
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500 break-all">
            QR gợi ý (demo): {roomQrToken}
          </div>
        </details>
      </div>

      <div className="card p-4 space-y-2 text-sm">
        <Row label="Mã QR" status={qr ? (qrMatches ? "ok" : "err") : "pending"}>
          {qr ? (qrMatches ? "Khớp phòng ✓" : "Không khớp phòng") : "Chưa quét"}
        </Row>
        <Row label="Vị trí GPS" status={gps ? "ok" : gpsError ? "err" : "pending"}>
          {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : gpsError ?? "Đang lấy..."}
        </Row>
      </div>

      {submitError && (
        <div className="card p-3 bg-red-50 border-red-200 text-sm text-red-700">{submitError}</div>
      )}

      <button
        disabled={!qrMatches || !gps || submitting}
        onClick={handleCheckIn}
        className="btn bg-brand-600 text-white hover:bg-brand-700 h-11 px-4 w-full text-base disabled:opacity-50"
      >
        {submitting ? "Đang check-in..." : "Check-in & bắt đầu"}
      </button>
    </div>
  );
}

function Row({
  label,
  status,
  children,
}: {
  label: string;
  status: "ok" | "err" | "pending";
  children: React.ReactNode;
}) {
  const color =
    status === "ok" ? "text-green-700" : status === "err" ? "text-red-700" : "text-slate-500";
  const dot =
    status === "ok" ? "bg-green-500" : status === "err" ? "bg-red-500" : "bg-slate-300";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-slate-600 w-24">{label}:</span>
      <span className={`font-medium ${color}`}>{children}</span>
    </div>
  );
}
