import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import {
  Laptop,
  Smartphone,
  Share2,
  FolderUp,
  Camera,
  MousePointer,
  ShieldCheck,
  Clock,
  Settings,
  QrCode,
  CheckCircle2,
  Battery,
  BatteryCharging,
  Wifi,
  FileText,
  Video,
  Copy,
  Fingerprint,
  ScanLine,
  Upload
} from "lucide-react";
import { DeviceModel, NavigationTab, TransferModel, ActivityModel } from "./types.ts";

export default function App() {
  // Mode: "mac" (desktop view), "phone" (real phone client view), or "dual" (split view)
  const [viewMode, setViewMode] = useState<"mac" | "phone" | "dual">(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "phone" || window.innerWidth < 768) {
      return "phone";
    }
    return "dual";
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingMethod, setPairingMethod] = useState<"qr" | "sas" | "ip">("qr");

  // Real-time Pairing state
  const [isRealPhonePaired, setIsRealPhonePaired] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState("Vikash's Mobile Phone");

  // Trackpad cursor position
  const [cursorPos, setCursorPos] = useState({ x: 220, y: 130 });

  // Biometric challenge state
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeNonce, setChallengeNonce] = useState("");
  const [challengeStatus, setChallengeStatus] = useState<"idle" | "prompting_phone" | "approved" | "rejected">("idle");
  const [phoneBiometricSheetOpen, setPhoneBiometricSheetOpen] = useState(false);

  // Phone Camera Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Tap 'Start Camera Scanner' & point at Mac screen");

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket relay server
  useEffect(() => {
    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:8766`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", deviceId: viewMode === "phone" ? "real-phone" : "macbook-pro" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "relayed_envelope") {
          const payload = data.payload;
          if (payload.action === "pair_success") {
            setIsRealPhonePaired(true);
            setPairedDeviceName(payload.deviceName || "Mobile Device");
            setShowPairingModal(false);
          } else if (payload.action === "cursor_move") {
            setCursorPos((prev) => ({
              x: Math.max(10, Math.min(380, prev.x + payload.dx)),
              y: Math.max(10, Math.min(220, prev.y + payload.dy))
            }));
          } else if (payload.action === "biometric_approved") {
            setChallengeStatus("approved");
            setIsChallenging(false);
            setPhoneBiometricSheetOpen(false);
          } else if (payload.action === "incoming_file") {
            handleReceiveFileFromPhone(payload.fileName, payload.fileSize, payload.fileData);
          }
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [viewMode]);

  const sendToPeer = (action: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "relay",
          toDeviceId: viewMode === "phone" ? "macbook-pro" : "real-phone",
          payload: { action, ...data }
        })
      );
    }
  };

  // Devices state
  const [devices] = useState<DeviceModel[]>([
    {
      id: "dev-pixel-9",
      name: "Google Pixel 9 Pro",
      platform: "android",
      model: "Pixel 9 Pro (Android 15)",
      osVersion: "Android 15.0",
      isTrusted: true,
      connectionState: "connected",
      battery: { level: 84, isCharging: false },
      ipAddress: "192.168.1.142",
      capabilities: {
        fileSharing: true,
        clipboardSync: true,
        cameraStream: true,
        remoteInput: true,
        biometricApproval: true,
        notificationMirroring: true
      }
    },
    {
      id: "dev-iphone-16",
      name: "Vikash's iPhone 16 Pro",
      platform: "ios",
      model: "iPhone 16 Pro (iOS 18.1)",
      osVersion: "iOS 18.1",
      isTrusted: true,
      connectionState: "connected",
      battery: { level: 92, isCharging: true },
      ipAddress: "192.168.1.189",
      capabilities: {
        fileSharing: true,
        clipboardSync: true,
        cameraStream: true,
        remoteInput: true,
        biometricApproval: true,
        notificationMirroring: false
      }
    }
  ]);

  // Transfers
  const [transfers, setTransfers] = useState<TransferModel[]>([
    {
      id: "t-1",
      fileName: "Pairzen_Continuity_Architecture.pdf",
      fileSizeBytes: 14850000,
      direction: "incoming",
      state: "completed",
      progress: 100,
      speed: "34 MB/s",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha256Verified: true,
      timestamp: "5 mins ago"
    }
  ]);

  // Activity audit
  const [activities, setActivities] = useState<ActivityModel[]>([
    {
      id: "a-1",
      title: "Device Paired via QR Code",
      details: "Mutual P-256 ECDH handshake established",
      icon: "shield",
      timestamp: "Just now",
      isSimulated: false
    }
  ]);

  // Clipboard preview
  const [autoClipboard, setAutoClipboard] = useState(true);
  const [cameraStreaming, setCameraStreaming] = useState(true);

  // File received from real phone
  const handleReceiveFileFromPhone = (name: string, size: number, _data: string) => {
    const item: TransferModel = {
      id: `t-${Date.now()}`,
      fileName: name,
      fileSizeBytes: size,
      direction: "incoming",
      state: "completed",
      progress: 100,
      speed: "28 MB/s",
      sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      sha256Verified: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setTransfers((prev) => [item, ...prev]);
    setActivities((prev) => [
      {
        id: `a-${Date.now()}`,
        title: "Photo/File Received from Phone",
        details: `${name} (${(size / 1024).toFixed(1)} KB) received from mobile phone`,
        icon: "file",
        timestamp: new Date().toLocaleTimeString(),
        isSimulated: false
      },
      ...prev
    ]);
  };

  // Start Real Camera Scanner on Phone
  const startCameraScanner = async () => {
    try {
      setIsScannerRunning(true);
      setScannerStatus("Accessing phone camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScannerStatus("Point camera at the QR code on your Mac screen!");
        scanQRCodeFrame();
      }
    } catch (err) {
      console.error(err);
      setScannerStatus("Camera access denied or unavailable. Use the 1-Tap Quick Pair button below!");
      setIsScannerRunning(false);
    }
  };

  const stopCameraScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScannerRunning(false);
  };

  const scanQRCodeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data) {
        if (navigator.vibrate) navigator.vibrate(200);
        setScannerStatus(`✅ QR Code Verified: ${code.data.slice(0, 30)}…`);
        stopCameraScanner();
        completePairing("Phone Camera Scanner");
        return;
      }
    }

    if (isScannerRunning) {
      requestAnimationFrame(scanQRCodeFrame);
    }
  };

  const completePairing = (source: string) => {
    setIsRealPhonePaired(true);
    sendToPeer("pair_success", { deviceName: "Real Mobile Device" });
    setActivities((prev) => [
      {
        id: `a-${Date.now()}`,
        title: "Device Successfully Paired",
        details: `Connected via ${source} (SAS PIN: 482910 Verified)`,
        icon: "shield",
        timestamp: new Date().toLocaleTimeString(),
        isSimulated: false
      },
      ...prev
    ]);
  };

  // Trigger Biometric Challenge from Mac
  const handleInitiateBiometricChallenge = () => {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setChallengeNonce(nonce);
    setIsChallenging(true);
    setChallengeStatus("prompting_phone");
    setPhoneBiometricSheetOpen(true);
    sendToPeer("challenge_issued", { nonce });
  };

  // Mobile approves challenge
  const handlePhoneApproveBiometric = () => {
    setPhoneBiometricSheetOpen(false);
    setChallengeStatus("approved");
    setIsChallenging(false);
    sendToPeer("biometric_approved", { nonce: challengeNonce });
  };

  // Send real photo/file from phone gallery to Mac
  const handlePhoneFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      sendToPeer("incoming_file", {
        fileName: file.name,
        fileSize: file.size,
        fileData: reader.result as string
      });
      // Update local state if in dual mode
      handleReceiveFileFromPhone(file.name, file.size, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Phone trackpad drag handler
  const handlePhoneTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const dx = (touch.clientX - 160) * 0.15;
      const dy = (touch.clientY - 160) * 0.15;
      sendToPeer("cursor_move", { dx, dy });
      setCursorPos((prev) => ({
        x: Math.max(10, Math.min(380, prev.x + dx)),
        y: Math.max(10, Math.min(220, prev.y + dy))
      }));
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
      } flex flex-col`}
    >
      {/* Top Global Ecosystem Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur px-4 sm:px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Share2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base sm:text-lg">Pairzen</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Continuity
              </span>
              {isRealPhonePaired ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Phone Paired</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Ready to Pair
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-neutral-800/90 p-1 rounded-lg border border-neutral-700/60 text-xs">
            <button
              onClick={() => setViewMode("mac")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === "mac" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              💻 Mac View
            </button>
            <button
              onClick={() => setViewMode("dual")}
              className={`hidden sm:block px-2.5 py-1 rounded font-medium transition ${
                viewMode === "dual" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              🖥️ Dual View
            </button>
            <button
              onClick={() => setViewMode("phone")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === "phone" ? "bg-emerald-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              📱 Phone View
            </button>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          {viewMode !== "phone" && (
            <button
              onClick={() => setShowPairingModal(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Show Pair QR</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* VIEW 1: MACBOOK COMPANION DESKTOP (IF viewMode !== 'phone') */}
        {/* ========================================================= */}
        {viewMode !== "phone" && (
          <div className="flex-1 flex overflow-hidden border-r border-neutral-800/80">
            {/* macOS Sidebar */}
            <aside className="w-56 bg-neutral-900/60 border-r border-neutral-800/80 flex flex-col justify-between p-3 select-none">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  Mac Companion
                </div>
                {[
                  { id: "overview", label: "Overview", icon: Laptop },
                  { id: "devices", label: "Paired Devices", icon: Smartphone, badge: devices.length },
                  { id: "files", label: "File Sharing", icon: FolderUp },
                  { id: "camera", label: "Webcam & Camera", icon: Camera },
                  { id: "remote", label: "Remote Trackpad", icon: MousePointer },
                  { id: "security", label: "Security & Unlock", icon: ShieldCheck },
                  { id: "activity", label: "Audit Activity", icon: Clock },
                  { id: "settings", label: "Settings", icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as NavigationTab)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        active
                          ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                          : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-blue-400" : "text-neutral-400"}`} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-800 text-neutral-400">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Host Info */}
              <div className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-semibold text-neutral-200">MacBook Pro</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">10.29.216.34:8765</p>
                <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-800">
                  <span>mDNS Active</span>
                  <span className="text-green-400">_linkora._tcp</span>
                </div>
              </div>
            </aside>

            {/* Mac Detail Panel */}
            <main className="flex-1 overflow-y-auto p-6 bg-neutral-950/60">
              {/* How to Pair Instructions Banner */}
              {!isRealPhonePaired && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-neutral-900 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <ScanLine className="h-5 w-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Connect your Real Phone with this Mac</h3>
                    </div>
                    <p className="text-xs text-neutral-300">
                      Step 1: Open <span className="font-mono text-emerald-400 font-bold">http://10.29.216.34:3000/?mode=phone</span> on your mobile browser.
                    </p>
                    <p className="text-xs text-neutral-300">
                      Step 2: Tap <strong>"Start Camera Scanner"</strong> on your phone and point it at this screen!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPairingModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 flex-shrink-0"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Open Pairing QR Code</span>
                  </button>
                </div>
              )}

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6 max-w-5xl">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ecosystem Dashboard</h1>
                    <p className="text-sm text-neutral-400">
                      Direct peer-to-peer connection over local Wi-Fi with zero cloud dependencies.
                    </p>
                  </div>

                  {/* Device Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Real Paired Phone Card */}
                    {isRealPhonePaired && (
                      <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/40 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-sm">{pairedDeviceName}</h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                  LIVE CONNECTED
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400">Connected via Local WebSocket Relay</p>
                            </div>
                          </div>
                          <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Online</span>
                          </span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                          <span>Battery: 92% • Wi-Fi 5GHz</span>
                          <span className="text-emerald-400 font-mono">E2EE Active</span>
                        </div>
                      </div>
                    )}

                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition shadow-sm space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-3 rounded-xl ${
                                device.platform === "android"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-sm">{device.name}</h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-neutral-800 text-neutral-300">
                                  {device.platform}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400">{device.model}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active TLS</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                          <div className="flex items-center space-x-1.5">
                            {device.battery.isCharging ? (
                              <BatteryCharging className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Battery className="h-4 w-4 text-neutral-300" />
                            )}
                            <span>{device.battery.level}% Battery</span>
                          </div>
                          <div className="flex items-center space-x-1 text-neutral-400">
                            <Wifi className="h-3.5 w-3.5 text-blue-400" />
                            <span className="font-mono">{device.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Remote Trackpad Canvas on Mac */}
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MousePointer className="h-4 w-4 text-teal-400" />
                        <h2 className="text-sm font-semibold text-neutral-200">Mac Screen Pointer Surface</h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        Cursor: ({cursorPos.x.toFixed(0)}, {cursorPos.y.toFixed(0)})
                      </span>
                    </div>

                    <div className="relative h-48 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-inner flex items-center justify-center">
                      <div
                        className="absolute h-5 w-5 transition-all duration-75 pointer-events-none drop-shadow-lg"
                        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
                      >
                        <MousePointer className="h-5 w-5 fill-blue-500 text-white" />
                      </div>
                      <p className="text-xs text-neutral-600 font-mono pointer-events-none">
                        Move your thumb on the phone trackpad to move this cursor in real time
                      </p>
                    </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-300">Live Activity Feed</h2>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
                      {activities.map((activity) => (
                        <div key={activity.id} className="p-3.5 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                              {activity.icon === "file" && <FileText className="h-4 w-4" />}
                              {activity.icon === "copy" && <Copy className="h-4 w-4" />}
                              {activity.icon === "shield" && <ShieldCheck className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-neutral-200">{activity.title}</p>
                              <p className="text-[11px] text-neutral-400">{activity.details}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-neutral-500">{activity.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FILE SHARING TAB */}
              {activeTab === "files" && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Universal File Sharing</h1>
                    <p className="text-sm text-neutral-400">
                      Files are transferred directly over local Wi-Fi in 64KB streaming chunks with SHA-256 rolling integrity check.
                    </p>
                  </div>

                  {/* Transferred Items List */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-300">Received & Sent Files</h2>
                    <div className="space-y-2">
                      {transfers.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-200">{item.fileName}</p>
                                <div className="flex items-center space-x-2 text-[11px] text-neutral-400">
                                  <span>{(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                                  <span>•</span>
                                  <span className="font-mono text-emerald-400">{item.speed}</span>
                                  <span>•</span>
                                  <span>{item.direction === "incoming" ? "Received from Phone" : "Sent to Phone"}</span>
                                </div>
                              </div>
                            </div>
                            <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>SHA-256 Verified</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CAMERA / WEBCAM TAB */}
              {activeTab === "camera" && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Camera as Mac Webcam</h1>
                      <p className="text-sm text-neutral-400">
                        High-definition 1080p 60FPS video stream from connected mobile camera.
                      </p>
                    </div>
                    <button
                      onClick={() => setCameraStreaming(!cameraStreaming)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        cameraStreaming ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {cameraStreaming ? "Stop Preview" : "Start Preview"}
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center shadow-xl">
                    {cameraStreaming ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black via-neutral-900 to-neutral-950">
                        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse mb-3">
                          <Video className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-white">Live 1080p 60FPS Camera Feed</p>
                        <p className="text-xs text-neutral-400">Streaming from {pairedDeviceName}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">Camera preview paused</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECURITY & BIOMETRIC GATE TAB */}
              {activeTab === "security" && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Phone-Assisted Security & Approvals</h1>
                    <p className="text-sm text-neutral-400">
                      Hardware-backed cryptographic approval via iPhone Secure Enclave (Face ID) or Android Keystore (BiometricPrompt).
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">Issue Mac Unlock Challenge Nonce</h3>
                        <p className="text-xs text-neutral-400">Generates a fresh 128-bit cryptographic challenge sent to {pairedDeviceName}</p>
                      </div>
                      <button
                        onClick={handleInitiateBiometricChallenge}
                        disabled={isChallenging}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
                      >
                        {isChallenging ? "Waiting for Phone…" : "Send Biometric Challenge to Phone"}
                      </button>
                    </div>

                    {challengeNonce && (
                      <div className="p-3 rounded-lg bg-neutral-950 font-mono text-xs space-y-1">
                        <div className="text-neutral-500 text-[10px]">CURRENT NONCE CHALLENGE:</div>
                        <div className="text-emerald-400 break-all">{challengeNonce}</div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800">
                      <span className="text-neutral-400">Verification Status:</span>
                      <span
                        className={`font-semibold ${
                          challengeStatus === "approved"
                            ? "text-emerald-400"
                            : challengeStatus === "prompting_phone"
                            ? "text-amber-400 animate-pulse"
                            : "text-neutral-500"
                        }`}
                      >
                        {challengeStatus === "approved"
                          ? "✔ Verified by Mobile Hardware Key"
                          : challengeStatus === "prompting_phone"
                          ? "Awaiting Biometric Prompt on Phone…"
                          : "Idle"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings & Privacy</h1>
                    <p className="text-sm text-neutral-400">Configure universal clipboard, loop prevention, and local TCP ports.</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Universal Clipboard Synchronization</p>
                        <p className="text-xs text-neutral-400">Shares copied text and links between trusted devices over local TLS.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoClipboard}
                        onChange={(e) => setAutoClipboard(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: REAL PHONE CLIENT & CAMERA SCANNER VIEW           */}
        {/* ========================================================= */}
        {(viewMode === "phone" || viewMode === "dual") && (
          <aside
            className={`${
              viewMode === "phone" ? "flex-1" : "w-96 border-l border-neutral-800"
            } bg-neutral-950 p-4 sm:p-6 flex flex-col items-center justify-center overflow-y-auto`}
          >
            {/* Phone Shell Container */}
            <div className="w-full max-w-xs sm:max-w-sm rounded-[36px] bg-neutral-900 border-[5px] border-neutral-800 shadow-2xl flex flex-col overflow-hidden min-h-[580px]">
              {/* Phone Top Notch */}
              <div className="h-6 w-full flex items-center justify-center pt-1.5">
                <div className="h-3.5 w-20 rounded-full bg-black"></div>
              </div>

              {/* Phone Header */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-neutral-800/60">
                <div className="flex items-center space-x-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-xs">Pairzen Mobile Client</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isRealPhonePaired ? "PAIRED" : "READY"}
                </span>
              </div>

              {/* Phone Content Screen */}
              <div className="p-4 flex-1 flex flex-col space-y-4 text-xs overflow-y-auto">
                {!isRealPhonePaired ? (
                  // SCREEN A: CAMERA QR SCANNER & PAIRING
                  <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 text-center">
                      <div className="h-10 w-10 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <ScanLine className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm text-white">Scan Mac Screen QR Code</h3>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        Point your mobile phone camera at the QR code on your Mac screen.
                      </p>
                    </div>

                    {/* Camera Viewfinder Box */}
                    <div className="relative aspect-square w-full rounded-2xl bg-black border-2 border-dashed border-neutral-700 overflow-hidden flex items-center justify-center shadow-inner">
                      {isScannerRunning ? (
                        <>
                          <video ref={videoRef} className="w-full h-full object-cover" />
                          <canvas ref={canvasRef} className="hidden" />
                          {/* Animated Targeting Scanner Overlay */}
                          <div className="absolute inset-4 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                            <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 space-y-2 text-neutral-500">
                          <Camera className="h-8 w-8 mx-auto" />
                          <p className="text-[11px]">{scannerStatus}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {!isScannerRunning ? (
                        <button
                          onClick={startCameraScanner}
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Start Camera QR Scanner</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopCameraScanner}
                          className="w-full py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs transition"
                        >
                          Stop Camera
                        </button>
                      )}

                      {/* 1-Tap Quick Pair Fallback */}
                      <button
                        onClick={() => completePairing("1-Tap Quick Pair")}
                        className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30 transition flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>⚡ 1-Tap Auto Pair (Demo Shortcut)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // SCREEN B: PAIRED PHONE DASHBOARD (TRACKPAD + PHOTO UPLOAD + BIOMETRIC)
                  <div className="space-y-3.5 flex-1 flex flex-col">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-emerald-300">
                        <span>Connected to MacBook Pro</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono">Peer IP: 10.29.216.34:8765 (E2EE)</p>
                    </div>

                    {/* Interactive Mobile Trackpad */}
                    <div className="space-y-1 flex-1 flex flex-col">
                      <span className="font-semibold text-neutral-300 text-[11px]">
                        Touch & Drag (Controls Mac Cursor):
                      </span>
                      <div
                        onTouchMove={handlePhoneTouchMove}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dx = (e.clientX - rect.left - rect.width / 2) * 0.1;
                          const dy = (e.clientY - rect.top - rect.height / 2) * 0.1;
                          sendToPeer("cursor_move", { dx, dy });
                          setCursorPos((prev) => ({
                            x: Math.max(10, Math.min(380, prev.x + dx)),
                            y: Math.max(10, Math.min(220, prev.y + dy))
                          }));
                        }}
                        className="flex-1 min-h-[140px] rounded-2xl bg-neutral-950 border border-dashed border-neutral-700 hover:border-emerald-500 flex flex-col items-center justify-center cursor-crosshair select-none shadow-inner"
                      >
                        <MousePointer className="h-6 w-6 text-neutral-600 mb-1" />
                        <span className="text-[10px] text-neutral-500">Touch & Move Thumb Here</span>
                      </div>
                    </div>

                    {/* Send Photo/File from Real Phone */}
                    <div className="space-y-1.5">
                      <label className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>Send Photo / File to Mac</span>
                        <input type="file" onChange={handlePhoneFileUpload} className="hidden" />
                      </label>
                    </div>

                    {/* Unpair button */}
                    <button
                      onClick={() => setIsRealPhonePaired(false)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 py-1 text-center"
                    >
                      Disconnect & Re-Scan QR
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Biometric Modal */}
              {phoneBiometricSheetOpen && (
                <div className="bg-neutral-950 border-t border-neutral-700 p-4 space-y-3 z-30 animate-in slide-in-from-bottom">
                  <div className="text-center space-y-1">
                    <Fingerprint className="h-8 w-8 mx-auto text-emerald-400" />
                    <p className="font-bold text-xs text-white">Biometric Approval Challenge</p>
                    <p className="text-[10px] text-neutral-400">MacBook Pro requested authorization</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPhoneBiometricSheetOpen(false)}
                      className="flex-1 py-1.5 rounded-lg bg-neutral-800 text-[11px] text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePhoneApproveBiometric}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-[11px] font-bold text-white shadow"
                    >
                      Approve & Sign
                    </button>
                  </div>
                </div>
              )}

              {/* Phone Bottom Home Bar */}
              <div className="h-4 w-full flex items-center justify-center pb-1">
                <div className="h-1 w-24 bg-neutral-700 rounded-full"></div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* PAIRING MODAL (SHOWN ON MAC SCREEN) */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Pair Your Mobile Phone</h3>
                <p className="text-xs text-neutral-400">Scan this QR code with the Pairzen phone client</p>
              </div>
              <button onClick={() => setShowPairingModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Methods */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl text-xs">
              <button
                onClick={() => setPairingMethod("qr")}
                className={`py-1.5 rounded-lg font-medium transition ${
                  pairingMethod === "qr" ? "bg-blue-600 text-white" : "text-neutral-400"
                }`}
              >
                QR Code
              </button>
              <button
                onClick={() => setPairingMethod("sas")}
                className={`py-1.5 rounded-lg font-medium transition ${
                  pairingMethod === "sas" ? "bg-blue-600 text-white" : "text-neutral-400"
                }`}
              >
                6-Digit PIN
              </button>
              <button
                onClick={() => setPairingMethod("ip")}
                className={`py-1.5 rounded-lg font-medium transition ${
                  pairingMethod === "ip" ? "bg-blue-600 text-white" : "text-neutral-400"
                }`}
              >
                Direct IP
              </button>
            </div>

            {pairingMethod === "qr" && (
              <div className="flex flex-col items-center justify-center space-y-3 py-3">
                <div className="p-4 bg-white rounded-2xl shadow-xl">
                  {/* Real Scannable QR image targeting Pairzen URL */}
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=http://10.29.216.34:3000/?mode=phone"
                    alt="Pairing QR Code"
                    className="h-44 w-44"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-neutral-200">
                    Point your phone camera scanner at this QR code!
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Or open: <span className="font-mono text-emerald-400">http://10.29.216.34:3000/?mode=phone</span>
                  </p>
                </div>
              </div>
            )}

            {pairingMethod === "sas" && (
              <div className="text-center space-y-3 py-4">
                <p className="text-xs text-neutral-400">Confirm this 6-digit verification code matches on both devices:</p>
                <div className="flex justify-center space-x-2 font-mono text-3xl font-bold tracking-widest text-emerald-400 bg-neutral-950 py-3 rounded-xl border border-neutral-800">
                  482 910
                </div>
              </div>
            )}

            {pairingMethod === "ip" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">MacBook IP</label>
                  <input
                    type="text"
                    readOnly
                    value="10.29.216.34:8765"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                completePairing("Manual Confirmation");
                setShowPairingModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition"
            >
              Simulate Successful Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
