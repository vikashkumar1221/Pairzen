# Linkora — Cross-Platform Apple Continuity Ecosystem

Linkora is a production-oriented cross-platform device ecosystem that seamlessly connects your **MacBook** with **Android phones** and **iPhones**, delivering Apple Continuity-like capabilities across mixed operating systems.

---

## 🌟 Capabilities

- ⚡ **Universal File Sharing**: Stream multi-gigabyte photos, 4K videos, documents, and archives in 64KB chunks directly over local Wi-Fi with SHA-256 rolling integrity verification. No file size limits, no memory spikes, zero cloud uploads.
- 📋 **Universal Clipboard**: Opt-in text and link synchronization between trusted devices with deduplication and loop prevention.
- 📷 **Phone Camera as Mac Webcam**: High-definition (1080p 60FPS) video stream from iPhone or Android into macOS, with lens switching, torch control, and document scanner mode.
- 🖱️ **Remote Trackpad & Keyboard**: Responsive multitouch trackpad and keyboard input powered by macOS Accessibility APIs.
- 🛡️ **Phone-Assisted Biometric Security**: Challenge-nonce signing using iPhone Secure Enclave (Face ID) or Android Keystore (BiometricPrompt) for session approval and permission gating.
- 🔔 **Notification Mirroring**: Forward Android notifications to your Mac using Android's native `NotificationListenerService`.

---

## 📁 Monorepo Structure

```
├── apps/
│   ├── macos/              # Native macOS companion (Swift 6 + SwiftUI + AppKit)
│   │   ├── Sources/LinkoraCore/     # Framing, Crypto, Bonjour, Chunked File Engine, Remote Input
│   │   ├── Sources/LinkoraApp/      # Native SwiftUI macOS App (Sidebar, Detail Views)
│   │   └── Tests/LinkoraCoreTestsRunner/ # Native Swift test suite executable
│   ├── android/            # Native Android companion (Kotlin + Jetpack Compose)
│   │   └── app/src/main/            # Material3 UI, Keystore, CameraX, ForegroundService
│   ├── ios/                # Native iOS companion (Swift 6 + SwiftUI)
│   │   └── Sources/LinkoraIOSCore/  # Secure Enclave, Network.framework, Mobile UI
│   └── web/                # React 19 + TypeScript + Vite + Tailwind interactive simulator
├── packages/
│   ├── protocol/           # Shared wire protocol, 12-byte framing, crypto helpers, tests
│   └── server/             # Optional Node.js + TypeScript zero-knowledge E2EE WebSocket relay
└── docs/
    ├── PROTOCOL.md         # Wire framing format, message types, SAS derivation
    ├── SECURITY.md         # Threat model, replay defense, macOS login window reality
    ├── SETUP.md            # Platform-specific build & installation instructions
    └── PLATFORM_LIMITATIONS.md # In-depth analysis of sandbox limits (CMIO, PAM, iOS limits)
```

---

## 🚀 Quick Start & Verification

### 1. Run Native macOS Test Suite
```bash
cd apps/macos
swift run LinkoraCoreTestsRunner
```
*Validates binary wire framing, partial stream accumulation, AES-GCM-256 encryption, 6-digit SAS code derivation, and biometric challenge replay defense.*

### 2. Build Native macOS Companion App
```bash
cd apps/macos
swift build --target LinkoraApp
```

### 3. Run Protocol Package Tests
```bash
cd packages/protocol
npm test
```

### 4. Run Relay Server Tests
```bash
cd packages/server
npm test
```

### 5. Launch the Interactive Web Dashboard & Multi-Device Simulator
```bash
cd apps/web
npm run build
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to preview the interactive MacBook desktop app alongside interactive Android and iPhone simulators in real-time.

---

## 🔒 Truth-in-Engineering & Security Boundaries

Linkora adheres to transparent engineering:
1. **macOS Login Window**: Third-party user-space applications cannot legally bypass the native FileVault / system loginwindow via public APIs. Linkora implements a cryptographic **App-Level Session Lock** and clearly documents this boundary in [docs/SECURITY.md](docs/SECURITY.md).
2. **Virtual Webcam**: In-app streaming works immediately over local TCP sockets. System-wide webcam support in FaceTime and Zoom requires a signed `CMIOExtension` driver, detailed in [docs/PLATFORM_LIMITATIONS.md](docs/PLATFORM_LIMITATIONS.md).
3. **Mobile Clipboard & Notifications**: Mobile OS sandboxes restrict background clipboard reads (Android 10+, iOS 14+) and background notification interception (iOS). Linkora respects these boundaries without employing battery-draining hacks.
