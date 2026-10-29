# Linkora Setup & Build Guide

## 1. Prerequisites

- **macOS Companion**: macOS 13.0+ Ventura / macOS 14+ Sonoma / macOS 15+ Sequoia. Swift 6.0+ toolchain.
- **Android Companion**: Android 8.0+ (API 26+) for core features, Android 10+ recommended. Android Studio Ladybug+ / Gradle 8.7+ / JDK 17+.
- **iOS Companion**: iOS 16.0+, Xcode 15+, Swift 6.0+.
- **Web Dashboard & Simulator**: Node.js 18+, npm 9+.
- **Relay Server**: Node.js 20+, npm 10+.

---

## 2. macOS Companion Setup

### Build & Run Native macOS App:
```bash
cd apps/macos

# Run native test suite (validates framing, crypto, chunking, and biometric challenge verification)
swift run LinkoraCoreTestsRunner

# Compile native macOS application target
swift build --target LinkoraApp
```

### Required macOS Permissions & Entitlements:
1. **Local Network (`NSLocalNetworkUsageDescription`)**: Required for Bonjour mDNS peer discovery (`_linkora._tcp`).
2. **Accessibility (`AXIsProcessTrustedWithOptions`)**: Required for synthesizing mouse and keyboard events in Remote Trackpad mode. Open **System Settings > Privacy & Security > Accessibility** and grant permission to Linkora.
3. **Downloads Folder Access**: Granted automatically via App Sandbox bookmark or file importer.
4. **CoreMediaIO Extension**: Required only if compiling the system-wide webcam virtual camera driver (`com.apple.developer.coremediaio.camera-provider`). In-app preview works immediately without any system extension.

---

## 3. Android Companion Setup

### Build via Gradle:
```bash
cd apps/android

# Build Debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test
```

### Required Android Permissions:
1. **Camera**: QR code pairing and live webcam streaming.
2. **Biometrics (`USE_BIOMETRIC`)**: Used by `BiometricPrompt` to sign authentication challenges with Android Keystore.
3. **Notification Access**: Enable **Linkora Notification Mirror** under **Settings > Apps > Special app access > Notification access** to forward Android notifications to your Mac.
4. **Foreground Service**: Ensures 50GB file transfers and live camera streams are not terminated when the phone screen turns off.

---

## 4. iOS Companion Setup

### Build via Xcode:
```bash
cd apps/ios

# Open Package in Xcode or build via xcodebuild
xcodebuild -scheme LinkoraIOS -destination 'generic/platform=iOS'
```

### Required iOS Permissions:
1. **Local Network (`NSLocalNetworkUsageDescription`)**: Required to browse and resolve Bonjour services.
2. **Camera (`NSCameraUsageDescription`)**: Required for scanning pairing QR codes and 1080p camera streaming.
3. **Face ID (`NSFaceIDUsageDescription`)**: Required for signing authentication nonces using the Secure Enclave.

---

## 5. Web Dashboard & Interactive Multi-Device Simulator

The web dashboard allows you to explore the entire ecosystem, test file transfers, preview webcam feeds, and interact with the phone trackpad simulator side-by-side:

```bash
# Install dependencies
npm install

# Run the interactive web dashboard on localhost:3000
npm run web
```

---

## 6. Optional E2EE Cloud Relay Server

For devices on separate cellular networks or different Wi-Fi routers:

```bash
cd packages/server

# Build TypeScript server
npm run build

# Run unit tests
npm test

# Start server on port 8766
npm start
```
