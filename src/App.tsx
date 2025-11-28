// src/App.tsx
import React, { useEffect, useState } from "react";
import { z } from "zod";
import TextInput from "./components/TextInput";
import Button from "./components/Button";
import { generateCurrentTotp } from "./utils/totp";

const STORAGE_KEY = "mfa_authenticator_config";

type Screen = "loading" | "setup" | "otp";

interface DeviceConfig {
  readableKey: string;
  createdAt: string;
}

// Zod schema for 16-digit key
const keySchema = z
  .string()
  .min(16, "Key must be exactly 16 characters.")
  .max(16, "Key must be exactly 16 characters.")
  .regex(/^[A-Z0-9]+$/, "Key must contain only A–Z and 0–9.");

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<DeviceConfig | null>(null);

  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentOtp, setCurrentOtp] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [otpHighlight, setOtpHighlight] = useState<boolean>(false);

  // ---------- Load from localStorage ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: DeviceConfig = JSON.parse(raw);
        if (parsed.readableKey) {
          setConfig(parsed);
          setScreen("otp");
          return;
        }
      }
      setScreen("setup");
    } catch (err) {
      console.error("Error reading device config:", err);
      setScreen("setup");
    }
  }, []);

  const saveConfig = (cfg: DeviceConfig) => {
    setConfig(cfg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  };

  // ---------- Key input handler with cleaning ----------
  const handleKeyInputChange = (val: string) => {
    // Uppercase, remove invalid chars
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // Block beyond 16 chars
    if (cleaned.length <= 16) {
      setKeyInput(cleaned);
      setStatus("");
    }
  };

  // ---------- SETUP HANDLER ----------
  const handleSaveDevice = () => {
    // Validate with Zod
   const result = keySchema.safeParse(keyInput);
if (!result.success) {
  const msg = result.error.issues[0]?.message ?? "Invalid key.";
  setStatus(msg);
  return;
}


    setLoading(true);
    setStatus("");

    try {
      const cfg: DeviceConfig = {
        readableKey: keyInput,
        createdAt: new Date().toISOString(),
      };
      saveConfig(cfg);
      setKeyInput("");
      setStatus("Device paired successfully. Generating OTPs...");
      setScreen("otp");
    } catch (err) {
      console.error(err);
      setStatus("Failed to save device. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- OTP SCREEN LOGIC ----------
  useEffect(() => {
    if (screen !== "otp" || !config?.readableKey) return;

    let isCancelled = false;

    const updateOtp = async () => {
      try {
        const otp = await generateCurrentTotp(config.readableKey);
        if (!isCancelled) {
          setOtpHighlight(true);        // trigger animation
          setCurrentOtp(otp);
          setTimeout(() => setOtpHighlight(false), 250);
        }
      } catch (err) {
        console.error("Error generating OTP:", err);
        if (!isCancelled) {
          setCurrentOtp("------");
        }
      }
    };

    // Initial OTP + timer
    updateOtp();

    const tick = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = 30 - (nowSec % 30);
      setSecondsLeft(remaining);

      if (remaining === 30) {
        updateOtp();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [screen, config?.readableKey]);

  // ---------- RESET DEVICE ----------
  const handleResetDevice = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
    setCurrentOtp("");
    setSecondsLeft(30);
    setStatus("");
    setKeyInput("");
    setScreen("setup");
  };

  // ---------- UI ----------

  if (screen === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #000 100%)",
          color: "#e5e7eb",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #000 100%)",
          color: "#e5e7eb",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            borderRadius: 16,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow:
              "0 20px 40px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,0.9)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Auth App – Setup</h2>
          <p
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 16,
            }}
          >
            Paste the <strong>16-digit key</strong> from the Main App
            Dashboard. This device will stay paired until you reset it.
          </p>

          <TextInput
            label="16-digit Key"
            value={keyInput}
            onChange={handleKeyInputChange}
            maxLength={16}
            placeholder="AB12CD34EF56GH78"
          />

          <Button onClick={handleSaveDevice} loading={loading}>
            Save Device
          </Button>

          {status && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#fca5a5",
                whiteSpace: "pre-line",
              }}
            >
              {status}
            </p>
          )}

          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Key must be exactly 16 characters (A–Z, 0–9). Once saved, OTP will
            work fully offline.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "otp" && config) {
    const progressPercent = (secondsLeft / 30) * 100;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1d4ed8 0, #020617 55%, #000 100%)",
          color: "#e5e7eb",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            borderRadius: 16,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow:
              "0 20px 40px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,0.9)",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Auth App – OTP</h2>
          <p
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginBottom: 16,
            }}
          >
            This device is paired with your 16-digit key. Use the OTP below in
            the Main App for login or protected actions.
          </p>

          <div
            style={{
              marginTop: 8,
              padding: 16,
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.4))",
            }}
          >
            <div
              style={{
                fontSize: 13,
                marginBottom: 6,
                color: "#bfdbfe",
              }}
            >
              Your 6-digit OTP
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 32,
                letterSpacing: 8,
                marginBottom: 6,
                transition:
                  "transform 0.2s ease, text-shadow 0.2s ease, color 0.2s ease",
                transform: otpHighlight ? "scale(1.08)" : "scale(1)",
                textShadow: otpHighlight
                  ? "0 0 16px rgba(96,165,250,0.9)"
                  : "none",
                color: otpHighlight ? "#e0f2fe" : "#f9fafb",
              }}
            >
              {currentOtp || "------"}
            </div>

            {/* Progress bar */}
            <div
              style={{
                marginTop: 8,
                height: 4,
                borderRadius: 9999,
                background: "rgba(15,23,42,0.7)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  transition: "width 0.3s linear",
                  background:
                    "linear-gradient(to right, #38bdf8, #4f46e5, #a855f7)",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Refreshes in {secondsLeft}s
            </div>
          </div>

          <Button
            onClick={handleResetDevice}
            style={{ marginTop: 20, width: "100%" }}
          >
            Reset Device
          </Button>

          {status && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#c4b5fd",
                whiteSpace: "pre-line",
              }}
            >
              {status}
            </p>
          )}

          <p
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Refreshing the page will <strong>not</strong> log you out. To
            unpair this device, use <strong>Reset Device</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
      }}
    >
      Something went wrong.
    </div>
  );
};

export default App;
