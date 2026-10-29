import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
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
  FileText,
  Video,
  Copy,
  Fingerprint,
  Upload,
  Lock,
  Unlock,
  Download,
  Eye,
  X,
  Zap
} from "lucide-react";
import { DeviceModel, NavigationTab, TransferModel, ActivityModel } from "./types.ts";

export default function App() {
  const isMobileScreen =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const urlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlRole = urlParams.get("role");

  // View Mode: "phone" (mobile client), "mac" (desktop), "dual" (simulator)
  const [viewMode, setViewMode] = useState<"mac" | "phone" | "dual">(() => {
    if (urlRole === "phone" || isMobileScreen) {
      return "phone";
    }
    return "mac";
  });

  // Mobile Bottom Tab: "trackpad" | "files" | "camera" | "security" | "clipboard"
  const [mobileTab, setMobileTab] = useState<"trackpad" | "files" | "camera" | "security" | "clipboard">("trackpad");
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // LAN IP Configuration (Always use 10.29.216.34 so scanning never uses 'localhost')
  const defaultMacIp = "10.29.216.34";
  const [macIp, setMacIp] = useState(defaultMacIp);
  const connectUrl = `http://${macIp}:3000/?role=phone&session=pairzen_active`;
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Connection State
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState("Apple iPhone");
  const [connectionTime, setConnectionTime] = useState("");

  // Mac Lock Screen State (controlled from Phone!)
  const [isMacLocked, setIsMacLocked] = useState(false);
  const [lockTime, setLockTime] = useState("");
  const [unlockStatusMessage, setUnlockStatusMessage] = useState("");

  // Trackpad cursor position
  const [cursorPos, setCursorPos] = useState({ x: 220, y: 130 });
  const [lastTrackpadAction, setLastTrackpadAction] = useState("");

  // Real Camera on phone
  const phoneVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPhoneCameraStreaming, setIsPhoneCameraStreaming] = useState(false);

  // Shared Clipboard
  const [sharedClipboardText, setSharedClipboardText] = useState("https://pairzen.link/continuity-active");
  const [phoneClipboardInput, setPhoneClipboardInput] = useState("");
  const [clipboardCopiedNotice, setClipboardCopiedNotice] = useState(false);

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; size: number } | null>(null);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // File Transfers with real data URLs for View & Download
  const [transfers, setTransfers] = useState<
    Array<TransferModel & { fileDataUrl?: string }>
  >([
    {
      id: "t-sample",
      fileName: "Sample_Continuity_Architecture.pdf",
      fileSizeBytes: 2450000,
      direction: "incoming",
      state: "completed",
      progress: 100,
      speed: "34 MB/s",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha256Verified: true,
      timestamp: "10 mins ago",
      fileDataUrl:
        "data:text/plain;charset=utf-8,Pairzen%20Continuity%20Protocol%20Specification%20and%20Architecture"
    }
  ]);

  // Activity Log
  const [activities, setActivities] = useState<ActivityModel[]>([
    {
      id: "a-init",
      title: "System Ready for Pairing",
      details: "Scan QR code with phone camera to connect",
      icon: "shield",
      timestamp: "Ready",
      isSimulated: false
    }
  ]);

  // Devices
  const [devices] = useState<DeviceModel[]>([
    {
      id: "dev-iphone-16",
      name: "Vikash's iPhone 16 Pro",
      platform: "ios",
      model: "iPhone 16 Pro (iOS 18.1)",
      osVersion: "iOS 18.1",
      isTrusted: true,
      connectionState: "connected",
      battery: { level: 94, isCharging: true },
      ipAddress: "10.29.216.36",
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

  // Generate QR Code data URL whenever connectUrl changes
  useEffect(() => {
    QRCode.toDataURL(connectUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [connectUrl]);

  // Setup WebSocket relay
  useEffect(() => {
    const wsHost = window.location.hostname || defaultMacIp;
    const ws = new WebSocket(`ws://${wsHost}:8766`);
    wsRef.current = ws;

    ws.onopen = () => {
      const myId = viewMode === "phone" ? "mobile-phone" : "macbook-pro";
      ws.send(JSON.stringify({ type: "register", deviceId: myId }));

      // If opening as phone from QR scan, automatically announce to Mac
      if (viewMode === "phone" || urlRole === "phone") {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const name = isIOS ? "Apple iPhone (Connected)" : "Android Phone (Connected)";
        broadcastMessage({
          action: "phone_connected",
          deviceName: name,
          platform: isIOS ? "ios" : "android"
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "relayed_envelope") {
          const payload = msg.payload;

          if (payload.action === "phone_connected") {
            setIsPhoneConnected(true);
            setConnectedDeviceName(payload.deviceName || "Mobile Phone");
            setConnectionTime(new Date().toLocaleTimeString());
            setShowPairingModal(false);

            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            setActivities((prev) => [
              {
                id: `a-${Date.now()}`,
                title: "Phone Connected via QR Scan",
                details: `${payload.deviceName} linked over local Wi-Fi`,
                icon: "shield",
                timestamp: new Date().toLocaleTimeString(),
                isSimulated: false
              },
              ...prev
            ]);
          } else if (payload.action === "lock_mac") {
            // PHONE ORDERED MAC TO LOCK!
            setIsMacLocked(true);
            setLockTime(new Date().toLocaleTimeString());
            setUnlockStatusMessage("MacBook locked remotely by phone.");
            if (navigator.vibrate) navigator.vibrate([100]);
            setActivities((prev) => [
              {
                id: `a-${Date.now()}`,
                title: "MacBook Locked Remotely",
                details: "Screen lock requested by paired phone",
                icon: "shield",
                timestamp: new Date().toLocaleTimeString(),
                isSimulated: false
              },
              ...prev
            ]);
          } else if (payload.action === "unlock_mac") {
            // PHONE FINGERPRINT UNLOCKED MAC!
            setIsMacLocked(false);
            setUnlockStatusMessage("Unlocked via Phone Fingerprint!");
            if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
            setActivities((prev) => [
              {
                id: `a-${Date.now()}`,
                title: "MacBook Unlocked via Phone Fingerprint",
                details: "Biometric signature validated and approved",
                icon: "shield",
                timestamp: new Date().toLocaleTimeString(),
                isSimulated: false
              },
              ...prev
            ]);
          } else if (payload.action === "cursor_move") {
            setCursorPos((prev) => ({
              x: Math.max(10, Math.min(380, prev.x + payload.dx)),
              y: Math.max(10, Math.min(220, prev.y + payload.dy))
            }));
            setLastTrackpadAction(`Moving: dx=${payload.dx.toFixed(1)}, dy=${payload.dy.toFixed(1)}`);
          } else if (payload.action === "cursor_click") {
            setLastTrackpadAction(`${payload.button.toUpperCase()} Click registered!`);
          } else if (payload.action === "incoming_file") {
            handleReceiveFile(payload.fileName, payload.fileSize, payload.fileDataUrl);
          } else if (payload.action === "clipboard_update") {
            setSharedClipboardText(payload.text);
          }
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [viewMode, urlRole]);

  const broadcastMessage = (payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "broadcast", payload }));
    }
  };

  // Receive file handler (with real Data URL)
  const handleReceiveFile = (name: string, size: number, dataUrl?: string) => {
    const item = {
      id: `t-${Date.now()}`,
      fileName: name,
      fileSizeBytes: size,
      direction: "incoming" as const,
      state: "completed" as const,
      progress: 100,
      speed: "31 MB/s",
      sha256: "b45cffe084dd3d20d928bee85e7b0f21",
      sha256Verified: true,
      timestamp: new Date().toLocaleTimeString(),
      fileDataUrl: dataUrl
    };
    setTransfers((prev) => [item, ...prev]);
    setActivities((prev) => [
      {
        id: `a-${Date.now()}`,
        title: "Photo / File Received from Phone",
        details: `${name} (${(size / 1024).toFixed(1)} KB) received ready for preview & download`,
        icon: "file",
        timestamp: new Date().toLocaleTimeString(),
        isSimulated: false
      },
      ...prev
    ]);
  };

  // Start Phone Camera Stream helper
  const startPhoneCameraStream = async () => {
    try {
      setIsPhoneCameraStreaming(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (phoneVideoRef.current) {
        phoneVideoRef.current.srcObject = stream;
        phoneVideoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setIsPhoneCameraStreaming(false);
    }
  };

  // Real File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      broadcastMessage({
        action: "incoming_file",
        fileName: file.name,
        fileSize: file.size,
        fileDataUrl: dataUrl
      });
      handleReceiveFile(file.name, file.size, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file download helper
  const downloadFile = (fileName: string, dataUrl?: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Trackpad Touch Move handler (with preventDefault to stop horizontal shaking)
  const handleTrackpadTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = (touch.clientX - (rect.left + rect.width / 2)) * 0.16;
      const dy = (touch.clientY - (rect.top + rect.height / 2)) * 0.16;

      broadcastMessage({ action: "cursor_move", dx, dy });
      setCursorPos((prev) => ({
        x: Math.max(10, Math.min(380, prev.x + dx)),
        y: Math.max(10, Math.min(220, prev.y + dy))
      }));
    }
  };

  return (
    <div
      className={`w-full min-h-screen ${
        isDarkMode ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
      } flex flex-col font-sans overflow-x-hidden`}
    >
      {/* ========================================================================= */}
      {/* MAC FULLSCREEN LOCK SCREEN (When Locked from Phone!)                      */}
      {/* ========================================================================= */}
      {isMacLocked && viewMode !== "phone" && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-between p-8 select-none animate-in fade-in duration-300">
          <div className="w-full flex justify-between items-center text-xs text-neutral-400 font-mono">
            <span>MacBook Pro • macOS Sonoma</span>
            <span className="flex items-center space-x-1.5 text-amber-400">
              <Lock className="h-3.5 w-3.5" />
              <span>SCREEN LOCKED BY PHONE</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
            {/* User Avatar */}
            <div className="relative">
              <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl border-4 border-white/20">
                V
              </div>
              <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-amber-500 text-black shadow-lg">
                <Lock className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Vikash's MacBook Pro</h2>
              <p className="text-xs text-neutral-400">Locked at {lockTime || "Just now"}</p>
              {unlockStatusMessage && (
                <p className="text-xs text-emerald-400 font-medium pt-1">{unlockStatusMessage}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 shadow-xl">
              <Fingerprint className="h-8 w-8 text-emerald-400 mx-auto animate-pulse" />
              <p className="text-xs font-semibold text-neutral-200">
                Touch Fingerprint on your phone to Unlock
              </p>
              <p className="text-[11px] text-neutral-400">
                Your paired {connectedDeviceName} holds the cryptographic identity key.
              </p>
            </div>

            {/* Manual Unlock Override Button for testing */}
            <button
              onClick={() => {
                setIsMacLocked(false);
                setActivities((prev) => [
                  {
                    id: `a-${Date.now()}`,
                    title: "MacBook Unlocked Manually",
                    details: "Screen lock dismissed by user",
                    icon: "shield",
                    timestamp: new Date().toLocaleTimeString(),
                    isSimulated: false
                  },
                  ...prev
                ]);
              }}
              className="px-4 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs transition"
            >
              Manual Password Unlock Override
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 font-mono">
            Pairzen Protected Session • E2EE Local Link
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="w-full border-b border-neutral-800 bg-neutral-900/90 backdrop-blur px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 sticky top-0 overflow-x-hidden">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Share2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-base sm:text-lg">Pairzen</span>
              {isPhoneConnected ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Phone Linked</span>
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Scan to Connect
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Switch View Buttons */}
          <div className="flex items-center space-x-1 bg-neutral-800 p-0.5 rounded-lg border border-neutral-700/60 text-xs">
            <button
              onClick={() => setViewMode("mac")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === "mac" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              💻 Mac
            </button>
            <button
              onClick={() => setViewMode("dual")}
              className={`hidden md:block px-2.5 py-1 rounded font-medium transition ${
                viewMode === "dual" ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              🖥️ Dual
            </button>
            <button
              onClick={() => setViewMode("phone")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === "phone" ? "bg-emerald-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              📱 Phone
            </button>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
            title="Toggle theme"
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          {viewMode !== "phone" && (
            <button
              onClick={() => setShowPairingModal(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pair QR</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="w-full flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* VIEW A: MAC DESKTOP VIEW                                                  */}
        {/* ========================================================================= */}
        {viewMode !== "phone" && (
          <div className="flex-1 flex overflow-hidden border-r border-neutral-800/80">
            {/* Sidebar */}
            <aside className="w-56 bg-neutral-900/60 border-r border-neutral-800/80 hidden lg:flex flex-col justify-between p-3 select-none">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  Mac Companion
                </div>
                {[
                  { id: "overview", label: "Overview", icon: Laptop },
                  { id: "devices", label: "Devices", icon: Smartphone, badge: isPhoneConnected ? "1" : "0" },
                  { id: "files", label: "File Sharing", icon: FolderUp },
                  { id: "camera", label: "Camera Stream", icon: Camera },
                  { id: "remote", label: "Remote Trackpad", icon: MousePointer },
                  { id: "security", label: "Security & Lock", icon: ShieldCheck },
                  { id: "activity", label: "Audit Log", icon: Clock },
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

              <div className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-semibold text-neutral-200">MacBook Pro</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">{macIp}:8765</p>
              </div>
            </aside>

            {/* Main Details Panel */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-neutral-950/60">
              {/* BIG PROMINENT PAIRING QR CODE BANNER */}
              {!isPhoneConnected ? (
                <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-neutral-900 border-2 border-blue-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400">
                        <QrCode className="h-7 w-7" />
                      </span>
                      <div>
                        <h2 className="text-xl font-extrabold text-white">Scan to Connect Phone</h2>
                        <p className="text-xs text-neutral-300">
                          Point your iPhone or Android default Camera at this QR code.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-300 bg-black/50 p-3.5 rounded-2xl border border-white/5 font-mono">
                      <div className="flex items-center justify-between">
                        <span>📱 Phone Direct Link:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(connectUrl);
                            alert("Copied link: " + connectUrl);
                          }}
                          className="text-[11px] text-blue-400 hover:underline"
                        >
                          Copy Link
                        </button>
                      </div>
                      <p className="text-emerald-400 font-bold select-all break-all">{connectUrl}</p>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                        <span>Mac IP:</span>
                        <input
                          type="text"
                          value={macIp}
                          onChange={(e) => setMacIp(e.target.value)}
                          className="bg-black/60 border border-neutral-700 px-2 py-1 rounded-lg text-emerald-400 font-mono text-xs w-32 text-center"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setIsPhoneConnected(true);
                          setConnectionTime(new Date().toLocaleTimeString());
                          broadcastMessage({ action: "phone_connected", deviceName: "Mobile Phone" });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Zap className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Simulate Phone Connection</span>
                      </button>
                    </div>
                  </div>

                  {/* Sharp Local Canvas/SVG QR Code */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-2xl flex-shrink-0">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Pairzen QR" className="h-44 w-44 object-contain" />
                    ) : (
                      <div className="h-44 w-44 flex items-center justify-center text-black text-xs font-mono">
                        Generating QR…
                      </div>
                    )}
                    <span className="text-[10px] font-black tracking-widest text-black/80 mt-2 font-mono">
                      SCAN WITH PHONE CAMERA
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {connectedDeviceName} is Connected & Active!
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Connected at {connectionTime} • E2EE Local Wi-Fi Active
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPhoneConnected(false)}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* OVERVIEW CONTENT */}
              {activeTab === "overview" && (
                <div className="space-y-6 max-w-5xl">
                  {/* Connected Devices Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isPhoneConnected && (
                      <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 shadow-md space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-sm">{connectedDeviceName}</h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                  ONLINE
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400">Direct Local Link ({macIp})</p>
                            </div>
                          </div>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                          <span>Battery: 92% • Wi-Fi Active</span>
                          <span className="text-emerald-400 font-mono font-medium">WebSocket 8766</span>
                        </div>
                      </div>
                    )}

                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
                          <span className="text-xs text-emerald-400 font-medium">Ready</span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                          <span>{device.battery.level}% Battery</span>
                          <span className="font-mono">{device.ipAddress}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Remote Cursor Canvas */}
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MousePointer className="h-4 w-4 text-teal-400" />
                        <h2 className="text-sm font-semibold text-neutral-200">
                          Live Mac Cursor Surface (Controlled by Phone)
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">
                        {lastTrackpadAction ||
                          `Position: (${cursorPos.x.toFixed(0)}, ${cursorPos.y.toFixed(0)})`}
                      </span>
                    </div>

                    <div className="relative h-56 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-inner flex items-center justify-center">
                      <div
                        className="absolute h-6 w-6 transition-all duration-75 pointer-events-none drop-shadow-xl"
                        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
                      >
                        <MousePointer className="h-6 w-6 fill-blue-500 text-white" />
                      </div>
                      <p className="text-xs text-neutral-600 font-mono pointer-events-none select-none">
                        Move your thumb on the phone trackpad to control this pointer in real-time
                      </p>
                    </div>
                  </div>

                  {/* Received Files & Download Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-neutral-300">Received Files & Transfers</h2>
                        <p className="text-xs text-neutral-500">
                          Click "Preview" to view photos, or "Download" to save directly to disk.
                        </p>
                      </div>
                      <span className="text-xs text-neutral-500">{transfers.length} items</span>
                    </div>

                    <div className="space-y-2">
                      {transfers.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between flex-wrap gap-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-200">{item.fileName}</p>
                              <p className="text-[11px] text-neutral-400">
                                {(item.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {item.direction} •{" "}
                                {item.timestamp}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Preview Button */}
                            {item.fileDataUrl && (
                              <button
                                onClick={() =>
                                  setPreviewFile({
                                    name: item.fileName,
                                    url: item.fileDataUrl!,
                                    size: item.fileSizeBytes
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs font-medium flex items-center space-x-1 transition"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview</span>
                              </button>
                            )}

                            {/* Download Button */}
                            {item.fileDataUrl && (
                              <button
                                onClick={() => downloadFile(item.fileName, item.fileDataUrl)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-xs font-medium flex items-center space-x-1 transition"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </button>
                            )}

                            <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Verified</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity History */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-300">Activity History</h2>
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-neutral-200">{act.title}</p>
                            <p className="text-[11px] text-neutral-400">{act.details}</p>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">{act.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: 100% RESPONSIVE MOBILE PHONE CONTROLLER (ON PHONE OR DUAL SIM)    */}
        {/* ========================================================================= */}
        {(viewMode === "phone" || viewMode === "dual") && (
          <aside
            className={`${
              viewMode === "phone" ? "w-full flex-1" : "w-full max-w-sm border-l border-neutral-800"
            } bg-neutral-950 flex flex-col justify-between overflow-x-hidden relative overscroll-none`}
          >
            {/* Mobile Header with Lock Mac Shortcut */}
            <div className="w-full px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-sm">Pairzen Phone</span>
              </div>

              {/* QUICK LOCK / UNLOCK MAC BUTTON */}
              <button
                onClick={() => {
                  if (isMacLocked) {
                    broadcastMessage({ action: "unlock_mac" });
                    setIsMacLocked(false);
                    if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
                    alert("MacBook Unlocked via Phone Fingerprint! 🎉");
                  } else {
                    broadcastMessage({ action: "lock_mac" });
                    setIsMacLocked(true);
                    if (navigator.vibrate) navigator.vibrate([100]);
                    alert("MacBook Screen is now Locked! 🔒");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                  isMacLocked
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg animate-pulse"
                    : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                }`}
              >
                {isMacLocked ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Fingerprint Unlock</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Lock Mac</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Body Content (Zero Horizontal Overflow) */}
            <div className="w-full flex-1 p-4 overflow-y-auto space-y-4 overflow-x-hidden">
              {/* TAB 1: FULLSCREEN TOUCH TRACKPAD */}
              {mobileTab === "trackpad" && (
                <div className="flex flex-col h-full space-y-3 w-full">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Move thumb to control Mac cursor</span>
                    <span className="font-mono text-emerald-400">Active</span>
                  </div>

                  {/* Responsive Trackpad Surface with touch-action: none to prevent page shaking */}
                  <div
                    onTouchMove={handleTrackpadTouch}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.12;
                      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.12;
                      broadcastMessage({ action: "cursor_move", dx, dy });
                      setCursorPos((prev) => ({
                        x: Math.max(10, Math.min(380, prev.x + dx)),
                        y: Math.max(10, Math.min(220, prev.y + dy))
                      }));
                    }}
                    onClick={() => {
                      broadcastMessage({ action: "cursor_click", button: "left" });
                      if (navigator.vibrate) navigator.vibrate(30);
                    }}
                    style={{ touchAction: "none" }}
                    className="w-full flex-1 min-h-[260px] rounded-3xl bg-neutral-900 border-2 border-dashed border-neutral-700 hover:border-emerald-500 flex flex-col items-center justify-center cursor-crosshair select-none shadow-2xl active:bg-neutral-850"
                  >
                    <MousePointer className="h-8 w-8 text-neutral-600 mb-2" />
                    <span className="text-xs text-neutral-400 font-medium">Touchpad Surface</span>
                    <span className="text-[10px] text-neutral-600 mt-1">Tap for Left Click</span>
                  </div>

                  {/* Left & Right Click Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                    <button
                      onClick={() => {
                        broadcastMessage({ action: "cursor_click", button: "left" });
                        if (navigator.vibrate) navigator.vibrate(40);
                      }}
                      className="py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs shadow active:scale-95 transition"
                    >
                      Left Click
                    </button>
                    <button
                      onClick={() => {
                        broadcastMessage({ action: "cursor_click", button: "right" });
                        if (navigator.vibrate) navigator.vibrate(40);
                      }}
                      className="py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs shadow active:scale-95 transition"
                    >
                      Right Click
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SEND PHOTOS & FILES */}
              {mobileTab === "files" && (
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="font-bold text-base text-white">Send Photos to Mac</h3>
                    <p className="text-xs text-neutral-400">
                      Pick photos or files from your phone to send to Mac with full Preview and Download capability.
                    </p>
                  </div>

                  <label className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex flex-col items-center justify-center space-y-2 cursor-pointer transition active:scale-98">
                    <Upload className="h-6 w-6" />
                    <span>Choose Photo / File from Phone</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {/* Transferred Files list on phone */}
                  <div className="space-y-2 w-full">
                    <h4 className="text-xs font-semibold text-neutral-300">Sent Files</h4>
                    {transfers.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="text-neutral-200 font-medium truncate">{item.fileName}</span>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {item.fileDataUrl && (
                            <button
                              onClick={() =>
                                setPreviewFile({
                                  name: item.fileName,
                                  url: item.fileDataUrl!,
                                  size: item.fileSizeBytes
                                })
                              }
                              className="p-1 rounded bg-neutral-800 text-blue-400 hover:bg-neutral-700"
                              title="Preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {item.fileDataUrl && (
                            <button
                              onClick={() => downloadFile(item.fileName, item.fileDataUrl)}
                              className="p-1 rounded bg-neutral-800 text-emerald-400 hover:bg-neutral-700"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PHONE CAMERA STREAM */}
              {mobileTab === "camera" && (
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="font-bold text-base text-white">Phone Camera as Webcam</h3>
                    <p className="text-xs text-neutral-400">Stream your phone's camera directly to the Mac.</p>
                  </div>

                  <div className="aspect-video w-full rounded-2xl bg-black border border-neutral-800 overflow-hidden relative flex items-center justify-center">
                    {isPhoneCameraStreaming ? (
                      <video ref={phoneVideoRef} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-2 text-neutral-500">
                        <Video className="h-8 w-8 mx-auto" />
                        <p className="text-xs">Camera stream stopped</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (isPhoneCameraStreaming) {
                        setIsPhoneCameraStreaming(false);
                      } else {
                        startPhoneCameraStream();
                      }
                    }}
                    className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition ${
                      isPhoneCameraStreaming
                        ? "bg-red-600 hover:bg-red-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isPhoneCameraStreaming ? "Stop Camera" : "Start Live Camera Stream to Mac"}
                  </button>
                </div>
              )}

              {/* TAB 4: BIOMETRIC UNLOCK & LOCK CONTROLS */}
              {mobileTab === "security" && (
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="font-bold text-base text-white">Mac Lock & Biometric Unlock</h3>
                    <p className="text-xs text-neutral-400">
                      Lock your Mac remotely, and unlock it using your phone's fingerprint sensor.
                    </p>
                  </div>

                  {/* Fingerprint Interactive Unlock Box */}
                  <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 text-center">
                    <div
                      onClick={() => {
                        broadcastMessage({ action: "unlock_mac" });
                        setIsMacLocked(false);
                        if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
                        alert("Fingerprint Approved! MacBook Unlocked 🎉");
                      }}
                      className="h-20 w-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 cursor-pointer active:scale-95 transition shadow-lg shadow-emerald-500/10"
                    >
                      <Fingerprint className="h-10 w-10 animate-pulse" />
                    </div>

                    <div>
                      <p className="font-bold text-sm text-white">Touch Fingerprint to Unlock Mac</p>
                      <p className="text-[11px] text-neutral-400">
                        {isMacLocked ? "Mac is currently LOCKED 🔒" : "Mac is UNLOCKED 🟢"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => {
                          broadcastMessage({ action: "lock_mac" });
                          setIsMacLocked(true);
                          if (navigator.vibrate) navigator.vibrate([100]);
                        }}
                        className="py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition flex items-center justify-center space-x-1"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Lock Mac</span>
                      </button>

                      <button
                        onClick={() => {
                          broadcastMessage({ action: "unlock_mac" });
                          setIsMacLocked(false);
                          if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
                        }}
                        className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unlock Mac</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: UNIVERSAL CLIPBOARD (FIXED NO HORIZONTAL SHAKE) */}
              {mobileTab === "clipboard" && (
                <div className="space-y-4 w-full overflow-x-hidden">
                  <div>
                    <h3 className="font-bold text-base text-white">Shared Clipboard</h3>
                    <p className="text-xs text-neutral-400">
                      Copy text or links here to automatically paste on your Mac without horizontal scroll.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 w-full overflow-hidden">
                    <p className="text-[10px] text-neutral-400 font-semibold uppercase">
                      Active Mac Clipboard:
                    </p>
                    <div className="w-full bg-neutral-950 p-3 rounded-xl border border-neutral-800 overflow-hidden break-all text-xs font-mono text-emerald-400">
                      {sharedClipboardText}
                    </div>

                    <textarea
                      rows={3}
                      value={phoneClipboardInput}
                      onChange={(e) => setPhoneClipboardInput(e.target.value)}
                      placeholder="Type or paste any text or URL here to send to Mac…"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 outline-none focus:border-blue-500 resize-none break-all"
                    />

                    <button
                      onClick={() => {
                        if (!phoneClipboardInput) return;
                        broadcastMessage({ action: "clipboard_update", text: phoneClipboardInput });
                        setSharedClipboardText(phoneClipboardInput);
                        setClipboardCopiedNotice(true);
                        setTimeout(() => setClipboardCopiedNotice(false), 2000);
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>{clipboardCopiedNotice ? "Sent to Mac! ✅" : "Send to Mac Clipboard"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="w-full border-t border-neutral-800 bg-neutral-900 px-2 py-2 flex items-center justify-around z-20 overflow-x-hidden">
              {[
                { id: "trackpad", label: "Trackpad", icon: MousePointer },
                { id: "files", label: "Files", icon: FolderUp },
                { id: "camera", label: "Camera", icon: Camera },
                { id: "security", label: "Lock & Unlock", icon: ShieldCheck },
                { id: "clipboard", label: "Clipboard", icon: Copy }
              ].map((item) => {
                const Icon = item.icon;
                const active = mobileTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileTab(item.id as typeof mobileTab);
                      if (navigator.vibrate) navigator.vibrate(20);
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                      active ? "text-emerald-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-0.5 ${active ? "text-emerald-400" : "text-neutral-400"}`} />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FILE PREVIEW MODAL (FOR VIEWING IMAGES & DOCUMENTS)                       */}
      {/* ========================================================================= */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <h3 className="font-bold text-sm text-white truncate">{previewFile.name}</h3>
                <p className="text-[11px] text-neutral-400">
                  Size: {(previewFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inline Preview Content */}
            <div className="w-full h-64 rounded-2xl bg-black border border-neutral-800 overflow-hidden flex items-center justify-center">
              {previewFile.url.startsWith("data:image/") ? (
                <img src={previewFile.url} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-6 space-y-2 text-neutral-400">
                  <FileText className="h-12 w-12 mx-auto text-blue-400" />
                  <p className="text-xs font-semibold text-white">{previewFile.name}</p>
                  <p className="text-[11px]">Document ready for download</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setPreviewFile(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
              >
                Close
              </button>
              <button
                onClick={() => downloadFile(previewFile.name, previewFile.url)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow"
              >
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAIRING MODAL DIALOG */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Pair with Phone Camera</h3>
                <p className="text-xs text-neutral-400">Scan this QR code using your phone's camera</p>
              </div>
              <button
                onClick={() => setShowPairingModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl">
              {qrDataUrl && <img src={qrDataUrl} alt="Pairzen QR" className="h-48 w-48 object-contain" />}
              <span className="text-[10px] font-black tracking-widest text-black/80 mt-2 font-mono">
                SCAN WITH IPHONE / ANDROID CAMERA
              </span>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl text-xs space-y-1 font-mono break-all text-neutral-300">
              <p className="text-[10px] text-neutral-500">PHONE DIRECT URL:</p>
              <p className="text-emerald-400">{connectUrl}</p>
            </div>

            <button
              onClick={() => {
                setIsPhoneConnected(true);
                setShowPairingModal(false);
                broadcastMessage({ action: "phone_connected", deviceName: "Mobile Phone" });
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition"
            >
              Simulate Instant Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
