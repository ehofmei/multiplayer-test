import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";
import { decodeSignal, encodeSignal } from "../network/qr-signal";

export function QrDisplay({
  value,
  kind,
}: {
  value: string;
  kind: "Invite" | "Join";
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setImage("");
    setError("");
    void (async () => {
      try {
        const text = await encodeSignal(value);
        if (text.length > 1_800)
          throw new Error(
            "This connection is too large for an easy-to-scan QR. Use copy/paste below.",
          );
        const image = await QRCode.toDataURL(text, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 640,
        });
        if (!cancelled) setImage(image);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "QR unavailable. Use copy/paste below.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);
  return (
    <div className="qr-display">
      {image ? (
        <img src={image} alt={`${kind} QR code`} width="640" height="640" />
      ) : (
        <p>{error || "Preparing QR code…"}</p>
      )}
      {image && (
        <p className="footnote">
          On the other device, tap <strong>Scan {kind}</strong> and point its
          camera at this code.
        </p>
      )}
    </div>
  );
}

export function QrReader({
  kind,
  disabled,
  onRead,
}: {
  kind: "Invite" | "Join";
  disabled: boolean;
  onRead: (raw: string) => Promise<void>;
}) {
  const [scanning, setScanning] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const handling = useRef(false);
  const alive = useRef(true);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      scanner.current?.destroy();
    };
  }, []);

  const read = async (raw: string) => {
    if (handling.current) return;
    handling.current = true;
    scanner.current?.destroy();
    scanner.current = null;
    setScanning(false);
    setReading(true);
    setError("");
    try {
      await decodeSignal(raw, kind === "Invite" ? "offer" : "answer");
      if (alive.current) await onReadRef.current(raw);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not read this QR. Try a fresh code.",
        );
    } finally {
      handling.current = false;
      if (alive.current) setReading(false);
    }
  };
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    if (!scanning || !video.current) return;
    let cancelled = false;
    const current = new QrScanner(
      video.current,
      (result) => {
        void readRef.current(result.data);
      },
      {
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        calculateScanRegion: (video) => {
          const scale =
            960 / Math.max(video.videoWidth, video.videoHeight, 960);
          return {
            x: 0,
            y: 0,
            width: video.videoWidth,
            height: video.videoHeight,
            downScaledWidth: Math.max(1, Math.round(video.videoWidth * scale)),
            downScaledHeight: Math.max(
              1,
              Math.round(video.videoHeight * scale),
            ),
          };
        },
        maxScansPerSecond: 5,
      },
    );
    scanner.current = current;
    void current.start().catch(() => {
      if (!cancelled) {
        setScanning(false);
        setError(
          "Camera unavailable or permission denied. Allow camera access and try again, import a QR image, or use copy/paste.",
        );
      }
    });
    return () => {
      cancelled = true;
      current.destroy();
      if (scanner.current === current) scanner.current = null;
    };
  }, [scanning]);

  return (
    <div className="qr-reader">
      <button
        type="button"
        disabled={disabled || reading || scanning}
        onClick={() => {
          setError("");
          setScanning(true);
        }}
      >
        Scan {kind}
      </button>
      <label
        className={`image-import ${disabled || reading || scanning ? "unavailable" : ""}`}
      >
        Import {kind} QR image
        <input
          type="file"
          accept="image/*"
          disabled={disabled || reading || scanning}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 10_000_000) {
              setError("Choose a QR image smaller than 10 MB.");
              return;
            }
            setError("");
            setReading(true);
            try {
              const result = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true,
                alsoTryWithoutScanRegion: true,
              });
              if (alive.current) await readRef.current(result.data);
            } catch (error) {
              console.debug("[Game Lab] QR image decoding failed:", error);
              if (alive.current)
                setError(
                  "No readable QR found in this image. Choose a clear QR image or use copy/paste.",
                );
            } finally {
              if (alive.current) setReading(false);
            }
          }}
        />
      </label>
      {scanning && (
        <div className="camera-panel">
          <p>Point the camera at the other device’s {kind.toLowerCase()} QR.</p>
          <video ref={video} muted playsInline aria-label="QR camera preview" />
          <button
            type="button"
            className="quiet"
            onClick={() => {
              scanner.current?.destroy();
              scanner.current = null;
              setScanning(false);
            }}
          >
            Stop Camera
          </button>
        </div>
      )}
      {reading && <p>Reading connection…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
