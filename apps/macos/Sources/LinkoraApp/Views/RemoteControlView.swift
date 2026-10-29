import SwiftUI
import LinkoraCore

struct RemoteControlView: View {
    @EnvironmentObject var appState: LinkoraAppState
    @State private var isListening = true
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Remote Trackpad & Input")
                            .font(.title2.bold())
                        Text("Use your connected phone screen as a multitouch trackpad and keyboard for this Mac.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Toggle("Accept Remote Input", isOn: $isListening)
                        .toggleStyle(.switch)
                }
                
                // Accessibility Permission Banner
                let isGranted = appState.remoteInputController.isAccessibilityGranted
                HStack(spacing: 14) {
                    Image(systemName: isGranted ? "checkmark.shield.fill" : "exclamationmark.triangle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(isGranted ? .green : .orange)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(isGranted ? "Accessibility Access Granted" : "Accessibility Permission Required")
                            .font(.headline)
                        Text(isGranted ? "Linkora can synthesize cursor movements and keystrokes from paired mobile devices." : "macOS requires explicit permission in System Settings to control the pointer.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if !isGranted {
                        Button("Open Settings") {
                            appState.remoteInputController.promptForAccessibilityPermission()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding(16)
                .background(isGranted ? Color.green.opacity(0.08) : Color.orange.opacity(0.08))
                .cornerRadius(12)
                
                // Simulated Trackpad Surface Viewport
                VStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(nsColor: .controlBackgroundColor))
                            .frame(maxWidth: .infinity)
                            .frame(height: 240)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
                            )
                        
                        VStack(spacing: 12) {
                            Image(systemName: "hand.tap.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.secondary)
                            Text("Remote Input Channel Active")
                                .font(.headline)
                            Text("Perform gestures on your phone: 1 finger move/click, 2 fingers scroll, 3 fingers mission control.")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: 360)
                        }
                    }
                }
                
                // Security Notice
                HStack {
                    Image(systemName: "lock.shield")
                        .foregroundColor(.secondary)
                    Text("Remote control commands are strictly accepted only from authenticated, trusted paired devices over encrypted TLS.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(24)
        }
    }
}
