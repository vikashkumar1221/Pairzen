import { useState } from "react";
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
  PlusCircle,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Battery,
  BatteryCharging,
  Wifi,
  FileText,
  Video,
  Copy,
  Sliders,
  Fingerprint
} from "lucide-react";
import { DeviceModel, NavigationTab, TransferModel, ActivityModel } from "./types.ts";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingMethod, setPairingMethod] = useState<"qr" | "sas" | "ip">("qr");
  const [dualView, setDualView] = useState(true);
  const [selectedMobilePlatform, setSelectedMobilePlatform] = useState<"android" | "ios">("android");
  
  // Biometric challenge state
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeNonce, setChallengeNonce] = useState("");
  const [challengeStatus, setChallengeStatus] = useState<"idle" | "prompting_phone" | "approved" | "rejected">("idle");
  const [mobileBiometricPromptOpen, setMobileBiometricPromptOpen] = useState(false);

  // Live Trackpad coordinates shared across mobile and mac
  const [cursorPos, setCursorPos] = useState({ x: 160, y: 100 });
  const [lastClickTime, setLastClickTime] = useState("");

  // Devices state
  const [devices, setDevices] = useState<DeviceModel[]>([
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
        notificationMirroring: false // Honest iOS limitation
      }
    }
  ]);

  // Transfers
  const [transfers, setTransfers] = useState<TransferModel[]>([
    {
      id: "t-1",
      fileName: "Continuity_Architecture_Spec.pdf",
      fileSizeBytes: 14850000,
      direction: "incoming",
      state: "completed",
      progress: 100,
      speed: "34 MB/s",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha256Verified: true,
      timestamp: "5 mins ago"
    },
    {
      id: "t-2",
      fileName: "4K_B-Roll_Sample.mp4",
      fileSizeBytes: 68400000,
      direction: "outgoing",
      state: "completed",
      progress: 100,
      speed: "42 MB/s",
      sha256: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
      sha256Verified: true,
      timestamp: "18 mins ago"
    }
  ]);

  // Activity audit
  const [activities, setActivities] = useState<ActivityModel[]>([
    {
      id: "a-1",
      title: "File Received via 64KB Chunk Stream",
      details: "Continuity_Architecture_Spec.pdf from Google Pixel 9 Pro (SHA-256 Verified)",
      icon: "file",
      timestamp: "18:04:12",
      isSimulated: true
    },
    {
      id: "a-2",
      title: "Universal Clipboard Synchronized",
      details: "Synced URL: https://developer.apple.com (Deduplication Hash OK)",
      icon: "copy",
      timestamp: "17:58:30",
      isSimulated: true
    },
    {
      id: "a-3",
      title: "Face ID Session Approval",
      details: "Hardware Secure Enclave signature verified for Mac session unlock",
      icon: "shield",
      timestamp: "17:42:01",
      isSimulated: true
    }
  ]);

  // Clipboard preview
  const [autoClipboard, setAutoClipboard] = useState(true);
  const [clipboardContent, setClipboardContent] = useState("https://linkora.app/ecosystem-demo");
  const [cameraStreaming, setCameraStreaming] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">("back");

  // Send simulated file
  const handleSimulatedFileUpload = () => {
    const newTransfer: TransferModel = {
      id: `t-${Date.now()}`,
      fileName: `Dataset_Export_${Math.floor(Math.random() * 1000)}.zip`,
      fileSizeBytes: 32400000,
      direction: "outgoing",
      state: "in_progress",
      progress: 0,
      speed: "36 MB/s",
      sha256: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      sha256Verified: false,
      timestamp: "Just now"
    };
    setTransfers(prev => [newTransfer, ...prev]);

    // Animate chunk streaming progress
    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 100) {
        clearInterval(interval);
        setTransfers(prev =>
          prev.map(t =>
            t.id === newTransfer.id
              ? { ...t, progress: 100, state: "completed", sha256Verified: true }
              : t
          )
        );
        setActivities(prev => [
          {
            id: `a-${Date.now()}`,
            title: "File Sent Successfully",
            details: `${newTransfer.fileName} streamed in 64KB chunks to ${devices[0].name}`,
            icon: "file",
            timestamp: new Date().toLocaleTimeString(),
            isSimulated: true
          },
          ...prev
        ]);
      } else {
        setTransfers(prev =>
          prev.map(t => (t.id === newTransfer.id ? { ...t, progress: current } : t))
        );
      }
    }, 300);
  };

  // Trigger Biometric Challenge to Phone
  const handleInitiateBiometricChallenge = () => {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    setChallengeNonce(nonce);
    setIsChallenging(true);
    setChallengeStatus("prompting_phone");
    setMobileBiometricPromptOpen(true);
  };

  const handleMobileBiometricApprove = () => {
    setMobileBiometricPromptOpen(false);
    setChallengeStatus("approved");
    setIsChallenging(false);
    setActivities(prev => [
      {
        id: `a-${Date.now()}`,
        title: "Biometric Approval Verified",
        details: `Hardware ${selectedMobilePlatform === "android" ? "Android Keystore" : "Apple Secure Enclave"} signature validated for nonce ${challengeNonce.slice(0, 8)}…`,
        icon: "shield",
        timestamp: new Date().toLocaleTimeString(),
        isSimulated: true
      },
      ...prev
    ]);
  };

  const currentDevice = devices.find(d => d.platform === selectedMobilePlatform) || devices[0];

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"} flex flex-col`}>
      {/* Top Global Ecosystem Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-lg">Linkora</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Continuity Engine
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Demo Simulation
              </span>
            </div>
            <p className="text-xs text-neutral-400">Production Cross-Platform Device Ecosystem (macOS • Android • iOS)</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Dual Simulator View Toggle */}
          <div className="flex items-center space-x-2 bg-neutral-800/80 p-1 rounded-lg border border-neutral-700/60 text-xs">
            <button
              onClick={() => setDualView(false)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                !dualView ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              Mac Only
            </button>
            <button
              onClick={() => setDualView(true)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                dualView ? "bg-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
              }`}
            >
              Dual Simulator (Mac + Phone)
            </button>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            title="Toggle Theme"
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>

          <button
            onClick={() => setShowPairingModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/30 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Pair Device</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* MACBOOK DESKTOP APP INTERFACE */}
        <div className="flex-1 flex overflow-hidden border-r border-neutral-800/80">
          {/* macOS App Sidebar */}
          <aside className="w-60 bg-neutral-900/60 border-r border-neutral-800/80 flex flex-col justify-between p-3 select-none">
            <div className="space-y-1">
              <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
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
                { id: "settings", label: "Settings", icon: Settings },
              ].map(tab => {
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

            {/* Bottom Host Info */}
            <div className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-neutral-200">MacBook Pro (Sonoma)</span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">192.168.1.100:8765</p>
              <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-800">
                <span>mDNS Active</span>
                <span className="text-green-400">_linkora._tcp</span>
              </div>
            </div>
          </aside>

          {/* macOS Main Detail Panel */}
          <main className="flex-1 overflow-y-auto p-8 bg-neutral-950/60">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6 max-w-5xl">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Ecosystem Dashboard</h1>
                  <p className="text-sm text-neutral-400">Connected devices communicate peer-to-peer over your local encrypted network.</p>
                </div>

                {/* Device Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map(device => (
                    <div
                      key={device.id}
                      className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-xl ${device.platform === "android" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
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

                      {/* Capabilities Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                          File Stream
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                          Shared Clipboard
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                          1080p Webcam
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                          Biometric Auth
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Action Tiles */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-neutral-300">Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab("files")}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex flex-col items-center justify-center space-y-2 group transition"
                    >
                      <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
                        <FolderUp className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Share Files</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("camera")}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex flex-col items-center justify-center space-y-2 group transition"
                    >
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Camera Stream</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("remote")}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex flex-col items-center justify-center space-y-2 group transition"
                    >
                      <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-110 transition">
                        <MousePointer className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Remote Trackpad</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("security")}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex flex-col items-center justify-center space-y-2 group transition"
                    >
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Biometric Gate</span>
                    </button>
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-300">Live Activity Feed</h2>
                    <button onClick={() => setActiveTab("activity")} className="text-xs text-blue-400 hover:underline">
                      View Full Audit Log
                    </button>
                  </div>
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
                    {activities.slice(0, 3).map(activity => (
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
                  <p className="text-sm text-neutral-400">Zero cloud upload: streaming in 64KB chunks directly over local Wi-Fi with SHA-256 rolling integrity verification.</p>
                </div>

                {/* Drag & Drop Simulation Dropzone */}
                <div
                  onClick={handleSimulatedFileUpload}
                  className="border-2 border-dashed border-neutral-700 hover:border-blue-500 rounded-2xl p-8 bg-neutral-900/50 flex flex-col items-center justify-center space-y-3 cursor-pointer transition group"
                >
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
                    <FolderUp className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click or Drop files here to send to phone</p>
                    <p className="text-xs text-neutral-400">Supports documents, RAW photos, 4K video clips, and folders</p>
                  </div>
                  <span className="text-[11px] px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30">
                    + Simulate 32MB File Streaming
                  </span>
                </div>

                {/* Transfers Queue */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-neutral-300">Active Queue & History</h2>
                  <div className="space-y-2">
                    {transfers.map(item => (
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

                          <div className="flex items-center space-x-2">
                            {item.sha256Verified && (
                              <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>SHA-256 Verified</span>
                              </span>
                            )}
                            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              {item.state.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {item.state === "in_progress" && (
                          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CAMERA & WEBCAM TAB */}
            {activeTab === "camera" && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Camera as Mac Webcam</h1>
                    <p className="text-sm text-neutral-400">Use your mobile phone's ultra-high resolution camera system in Zoom, Meet, or FaceTime.</p>
                  </div>
                  <button
                    onClick={() => setCameraStreaming(!cameraStreaming)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      cameraStreaming ? "bg-red-600 hover:bg-red-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {cameraStreaming ? "Stop Stream" : "Start 1080p Stream"}
                  </button>
                </div>

                {/* Simulated Webcam Viewport */}
                <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center shadow-xl">
                  {cameraStreaming ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black via-neutral-900 to-neutral-950">
                      {/* Stylized camera grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-r border-b border-white"></div>
                        <div className="border-b border-white"></div>
                        <div className="border-r border-white"></div>
                        <div className="border-r border-white"></div>
                        <div></div>
                      </div>

                      <div className="text-center space-y-2 z-10">
                        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                          <Video className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-white">Live 1080p 60FPS Video Feed Active</p>
                        <p className="text-xs text-neutral-400">Streaming from {currentDevice.name} ({cameraPosition} camera)</p>
                      </div>

                      {/* Stream Controls Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10 text-xs">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setCameraPosition(cameraPosition === "back" ? "front" : "back")}
                            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium"
                          >
                            Flip: {cameraPosition.toUpperCase()}
                          </button>
                          <button
                            onClick={() => setTorchEnabled(!torchEnabled)}
                            className={`px-2.5 py-1 rounded font-medium transition ${
                              torchEnabled ? "bg-amber-500 text-black" : "bg-neutral-800 text-white"
                            }`}
                          >
                            Flashlight: {torchEnabled ? "ON" : "OFF"}
                          </button>
                        </div>
                        <span className="font-mono text-emerald-400">Bitrate: 14.8 Mbps • Latency: 18ms</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 text-neutral-500">
                      <Camera className="h-12 w-12 mx-auto" />
                      <p className="text-sm font-semibold">Webcam Stream Paused</p>
                    </div>
                  )}
                </div>

                {/* macOS Virtual Camera Reality Notice */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-semibold">
                    <Sliders className="h-4 w-4" />
                    <span>System-Wide Virtual Camera API Reality (macOS 12.3+)</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Linkora streams in-app video instantly over local TCP sockets. To register as a system-wide webcam visible to Zoom and FaceTime, macOS requires a signed <strong>CoreMediaIO Extension (CMIOExtension)</strong> with the <code>com.apple.developer.coremediaio.camera-provider</code> entitlement.
                  </p>
                </div>
              </div>
            )}

            {/* REMOTE TRACKPAD & KEYBOARD TAB */}
            {activeTab === "remote" && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Remote Trackpad & Input</h1>
                  <p className="text-sm text-neutral-400">Your phone screen acts as a responsive multi-touch glass trackpad for this Mac.</p>
                </div>

                {/* Permission Banner */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-300">macOS Accessibility Permission Active</p>
                      <p className="text-neutral-400">Linkora is authorized to inject synthetic CGEvent cursor movements.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                    AXIsProcessTrusted: TRUE
                  </span>
                </div>

                {/* Interactive Simulated Mac Screen Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Mac Screen Viewport (Move pointer on the phone simulator on the right to test)</span>
                    <span className="font-mono">Coordinates: ({cursorPos.x}, {cursorPos.y})</span>
                  </div>
                  <div className="relative h-64 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-inner">
                    <div
                      className="absolute h-5 w-5 text-blue-400 transition-all duration-75 pointer-events-none drop-shadow-md"
                      style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
                    >
                      <MousePointer className="h-5 w-5 fill-blue-500 text-white" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-600 font-mono pointer-events-none">
                      Pointer Interactive Canvas
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & BIOMETRIC GATE TAB */}
            {activeTab === "security" && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Phone-Assisted Security & Approvals</h1>
                  <p className="text-sm text-neutral-400">Hardware-backed cryptographic approval via iPhone Secure Enclave (Face ID) or Android Keystore (BiometricPrompt).</p>
                </div>

                {/* macOS Login Window Boundary Reality Notice */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>macOS Login Screen Security Boundary (Integrity Transparency)</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Under macOS hardened runtime, third-party user-space applications cannot legally unlock the FileVault / native loginwindow. Any tool claiming to do so stores plaintext credentials or injects unverified PAM root hooks. Linkora implements a <strong>cryptographic app-level session gate and lock-screen approval challenge</strong>, proving identity using hardware private keys.
                  </p>
                </div>

                {/* Interactive Biometric Challenge Runner */}
                <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">Issue Mac Unlock Challenge Nonce</h3>
                      <p className="text-xs text-neutral-400">Generates a fresh 128-bit cryptographic challenge sent to {currentDevice.name}</p>
                    </div>
                    <button
                      onClick={handleInitiateBiometricChallenge}
                      disabled={isChallenging}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
                    >
                      {isChallenging ? "Waiting for Phone…" : "Send Biometric Challenge"}
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
                    <span className={`font-semibold ${
                      challengeStatus === "approved" ? "text-emerald-400" : challengeStatus === "prompting_phone" ? "text-amber-400 animate-pulse" : "text-neutral-500"
                    }`}>
                      {challengeStatus === "approved" ? "✔ Verified by Mobile Hardware Key" : challengeStatus === "prompting_phone" ? "Awaiting Biometric Prompt on Phone…" : "Idle"}
                    </span>
                  </div>
                </div>

                {/* Trusted Keys Registry */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-300">Trusted Hardware Public Keys</h3>
                  <div className="space-y-2">
                    {devices.map(device => (
                      <div key={device.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <Lock className="h-4 w-4 text-emerald-400" />
                          <div>
                            <p className="font-semibold text-neutral-200">{device.name}</p>
                            <p className="text-[11px] font-mono text-neutral-500">P-256 ECDSA • Hardware Enclave Key</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDevices(devices.filter(d => d.id !== device.id))}
                          className="px-2.5 py-1 rounded bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 font-medium"
                        >
                          Revoke Trust
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT ACTIVITY TAB */}
            {activeTab === "activity" && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Audit & Activity Log</h1>
                    <p className="text-sm text-neutral-400">Immutable local record of all peer events, file transfers, and biometric approvals.</p>
                  </div>
                  <button
                    onClick={() => setActivities([])}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300"
                  >
                    Clear Log
                  </button>
                </div>

                <div className="rounded-2xl bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
                  {activities.map(act => (
                    <div key={act.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                          {act.icon === "file" && <FileText className="h-4 w-4" />}
                          {act.icon === "copy" && <Copy className="h-4 w-4" />}
                          {act.icon === "shield" && <ShieldCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-neutral-200">{act.title}</span>
                            {act.isSimulated && (
                              <span className="text-[9px] font-bold px-1.5 rounded bg-neutral-800 text-neutral-400">
                                SIMULATED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400">{act.details}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-neutral-500">{act.timestamp}</span>
                    </div>
                  ))}
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
                      onChange={e => setAutoClipboard(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-950 text-xs text-neutral-400 space-y-1">
                    <p className="font-semibold text-neutral-300">Loop Prevention Architecture:</p>
                    <p>Every clipboard item is assigned a SHA-256 hash. Remote items applied to your local pasteboard are cached and never re-broadcast back to the network.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                  <h3 className="text-sm font-semibold">Network & Discovery Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-1">Local TCP Port</label>
                      <input
                        type="text"
                        defaultValue="8765"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Bonjour Service Type</label>
                      <input
                        type="text"
                        defaultValue="_linkora._tcp"
                        readOnly
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-400 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* MOBILE COMPANION SIMULATOR (DUAL VIEW PANE) */}
        {dualView && (
          <aside className="w-96 bg-neutral-950 p-6 flex flex-col items-center justify-center border-l border-neutral-800/80 overflow-y-auto">
            {/* Mobile Platform Switcher */}
            <div className="mb-4 flex items-center space-x-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                onClick={() => setSelectedMobilePlatform("android")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedMobilePlatform === "android" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Pixel 9 Pro (Android)
              </button>
              <button
                onClick={() => setSelectedMobilePlatform("ios")}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedMobilePlatform === "ios" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                iPhone 16 Pro (iOS)
              </button>
            </div>

            {/* Mobile Device Mockup Frame */}
            <div className="w-80 h-[580px] rounded-[44px] bg-neutral-900 border-[6px] border-neutral-800 shadow-2xl relative flex flex-col overflow-hidden">
              {/* Phone Dynamic Island / Camera Punch Hole */}
              <div className="h-6 w-full flex items-center justify-center pt-2">
                {selectedMobilePlatform === "ios" ? (
                  <div className="h-5 w-24 rounded-full bg-black flex items-center justify-center space-x-1">
                    <span className="h-2 w-2 rounded-full bg-neutral-900"></span>
                  </div>
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full bg-black border border-neutral-800"></div>
                )}
              </div>

              {/* Mobile App Header */}
              <div className="px-5 py-2.5 flex items-center justify-between border-b border-neutral-800/60">
                <div className="flex items-center space-x-2">
                  <Share2 className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-xs">Linkora Mobile</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              {/* Mobile App Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                {/* Host Mac Connection Status */}
                <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">MacBook Pro (Connected)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">192.168.1.100</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">Direct TLS 1.3 Local Link</p>
                </div>

                {/* Mobile Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSimulatedFileUpload}
                    className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center space-y-1 transition"
                  >
                    <FolderUp className="h-5 w-5 text-blue-400" />
                    <span className="text-[11px] font-semibold">Send File</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileBiometricPromptOpen(true);
                      setChallengeStatus("prompting_phone");
                    }}
                    className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center space-y-1 transition"
                  >
                    <Fingerprint className="h-5 w-5 text-amber-400" />
                    <span className="text-[11px] font-semibold">Biometric Sign</span>
                  </button>
                </div>

                {/* Interactive Mobile Trackpad Touch Area */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-neutral-400">Touch & Drag (Controls Mac Cursor):</span>
                  <div
                    onMouseMove={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.max(0, Math.min(300, Math.floor(e.clientX - rect.left) * 1.5));
                      const y = Math.max(0, Math.min(200, Math.floor(e.clientY - rect.top) * 1.5));
                      setCursorPos({ x, y });
                    }}
                    onClick={() => setLastClickTime(new Date().toLocaleTimeString())}
                    className="h-32 rounded-xl bg-neutral-800/50 border border-dashed border-neutral-700 hover:border-blue-500 cursor-crosshair flex flex-col items-center justify-center select-none"
                  >
                    <MousePointer className="h-6 w-6 text-neutral-600 mb-1" />
                    <span className="text-[10px] text-neutral-500">Touch Surface</span>
                    {lastClickTime && (
                      <span className="text-[9px] text-emerald-400 font-mono">Last Click: {lastClickTime}</span>
                    )}
                  </div>
                </div>

                {/* Mobile Clipboard Banner */}
                <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-semibold">SHARED CLIPBOARD:</span>
                    <button
                      onClick={() => setClipboardContent(`https://linkora.app/share-${Math.floor(Math.random() * 1000)}`)}
                      className="text-[9px] text-blue-400 hover:underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-300 truncate">{clipboardContent}</p>
                </div>
              </div>

              {/* Mobile Biometric Prompt Sheet / Modal */}
              {mobileBiometricPromptOpen && (
                <div className="absolute inset-x-0 bottom-0 bg-neutral-900 border-t border-neutral-700 p-5 rounded-t-3xl shadow-2xl z-30 animate-in slide-in-from-bottom duration-200 space-y-3">
                  <div className="h-1 w-10 bg-neutral-700 rounded-full mx-auto mb-2"></div>
                  <div className="text-center space-y-1">
                    <div className="h-12 w-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Fingerprint className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-sm">
                      {selectedMobilePlatform === "android" ? "Android BiometricPrompt" : "Apple Face ID"}
                    </p>
                    <p className="text-xs text-neutral-400">Approve Mac session authorization challenge</p>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => setMobileBiometricPromptOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-neutral-800 text-xs font-semibold text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMobileBiometricApprove}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-600/30"
                    >
                      Approve & Sign
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Home Indicator bar */}
              <div className="h-4 w-full flex items-center justify-center pb-2">
                <div className="h-1 w-28 bg-neutral-700 rounded-full"></div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* PAIRING MODAL */}
      {showPairingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Pair Mobile Device</h3>
                <p className="text-xs text-neutral-400">Connect Android or iPhone over local Wi-Fi</p>
              </div>
              <button
                onClick={() => setShowPairingModal(false)}
                className="text-neutral-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-lg text-xs">
              <button
                onClick={() => setPairingMethod("qr")}
                className={`py-1.5 rounded-md font-medium transition ${pairingMethod === "qr" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                QR Code
              </button>
              <button
                onClick={() => setPairingMethod("sas")}
                className={`py-1.5 rounded-md font-medium transition ${pairingMethod === "sas" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                SAS Code
              </button>
              <button
                onClick={() => setPairingMethod("ip")}
                className={`py-1.5 rounded-md font-medium transition ${pairingMethod === "ip" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Direct IP
              </button>
            </div>

            {pairingMethod === "qr" && (
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QrCode className="h-40 w-40 text-black" />
                </div>
                <p className="text-xs text-neutral-400 text-center max-w-xs">
                  Scan this code using the camera scanner in the Linkora app on your phone.
                </p>
              </div>
            )}

            {pairingMethod === "sas" && (
              <div className="text-center space-y-3 py-4">
                <p className="text-xs text-neutral-400">Confirm this 6-digit verification code matches on both devices:</p>
                <div className="flex justify-center space-x-2 font-mono text-2xl font-bold tracking-widest text-emerald-400 bg-neutral-950 py-3 rounded-xl border border-neutral-800">
                  482 910
                </div>
              </div>
            )}

            {pairingMethod === "ip" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Phone Local IP</label>
                  <input
                    type="text"
                    placeholder="192.168.1.142"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Port</label>
                  <input
                    type="text"
                    defaultValue="8765"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPairingModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
