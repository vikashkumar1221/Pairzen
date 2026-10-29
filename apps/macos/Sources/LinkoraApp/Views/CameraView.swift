import SwiftUI
import LinkoraCore

struct CameraView: View {
    @EnvironmentObject var appState: LinkoraAppState
    @State private var isFrontCamera = false
    @State private var isTorchOn = false
    @State private var isScannerMode = false
    @State private var isStreaming = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Mobile Camera as Webcam")
                            .font(.title2.bold())
                        Text("Stream high-definition video from your iPhone or Android directly into your Mac.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Toggle("Stream Active", isOn: $isStreaming)
                        .toggleStyle(.switch)
                }
                
                // Camera Viewport
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.black.opacity(0.85))
                        .frame(maxWidth: .infinity)
                        .frame(height: 380)
                    
                    if isStreaming {
                        VStack(spacing: 12) {
                            Image(systemName: "video.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.white.opacity(0.8))
                            Text("1080p 60FPS Video Feed Streaming")
                                .font(.headline)
                                .foregroundColor(.white)
                            Text("Connected peer: \(appState.selectedDevice?.name ?? "Mobile Device")")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    } else {
                        VStack(spacing: 12) {
                            Image(systemName: "video.slash.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("Camera Feed Inactive")
                                .font(.headline)
                                .foregroundColor(.gray)
                            Text("Toggle 'Stream Active' to start preview from paired phone.")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }
                .overlay(
                    // Floating Controls Bar
                    HStack(spacing: 16) {
                        Button(action: { isFrontCamera.toggle() }) {
                            Label(isFrontCamera ? "Front Camera" : "Rear Camera", systemImage: "arrow.triangle.2.circlepath.camera")
                        }
                        .buttonStyle(.bordered)
                        
                        Button(action: { isTorchOn.toggle() }) {
                            Label(isTorchOn ? "Torch On" : "Torch Off", systemImage: isTorchOn ? "flashlight.on.fill" : "flashlight.off.fill")
                        }
                        .buttonStyle(.bordered)
                        
                        if isScannerMode {
                            Button(action: { isScannerMode.toggle() }) {
                                Label("Document Scanner", systemImage: "doc.viewfinder")
                            }
                            .buttonStyle(.borderedProminent)
                        } else {
                            Button(action: { isScannerMode.toggle() }) {
                                Label("Document Scanner", systemImage: "doc.viewfinder")
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(14)
                    .background(.ultraThinMaterial)
                    .cornerRadius(12)
                    .padding(16),
                    alignment: .bottom
                )
                
                // System-wide Webcam Status & Technical Reality
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.blue)
                        Text("System-Wide Webcam Extension (FaceTime, Zoom, Google Meet)")
                            .font(.headline)
                    }
                    
                    Text("In-app preview and document capture work immediately over local Wi-Fi. To publish this feed as a virtual webcam in third-party Mac apps (Zoom, Teams, FaceTime), macOS 12.3+ requires a signed **CoreMediaIO Extension (CMIOExtension)**.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 12) {
                        Text("CMIO Extension Status:")
                            .font(.caption.bold())
                        Text(appState.virtualCamera.isSystemWideDriverInstalled ? "Installed & Active" : "Not Installed (In-App View Active)")
                            .font(.caption)
                            .foregroundColor(appState.virtualCamera.isSystemWideDriverInstalled ? .green : .orange)
                    }
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(10)
            }
            .padding(24)
        }
    }
}
