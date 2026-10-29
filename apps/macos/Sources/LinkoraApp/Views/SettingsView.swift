import SwiftUI
import LinkoraCore

struct SettingsView: View {
    @EnvironmentObject var appState: LinkoraAppState
    
    @AppStorage("autoClipboardSync") private var autoClipboardSync = true
    @AppStorage("downloadPort") private var downloadPort = "8765"
    @AppStorage("enableRemoteRelay") private var enableRemoteRelay = false
    @AppStorage("notifyOnTransfer") private var notifyOnTransfer = true
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Settings & Preferences")
                        .font(.title2.bold())
                    Text("Configure network ports, privacy limits, and synchronization behavior.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Clipboard Settings
                VStack(alignment: .leading, spacing: 12) {
                    Text("Universal Clipboard")
                        .font(.headline)
                    
                    Toggle("Enable Automatic Clipboard Synchronization", isOn: $autoClipboardSync)
                        .onChange(of: autoClipboardSync) { newValue in
                            appState.clipboardEngine.isEnabled = newValue
                        }
                    
                    Text("Linkora includes cryptographic loop prevention: items received from remote devices are hashed and never re-broadcast back.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("Note on iOS & Android: Due to mobile operating system privacy sandboxing, clipboard is accessible on mobile only when the Linkora app is active or opened via the system Share Sheet.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(10)
                
                // Network Configuration
                VStack(alignment: .leading, spacing: 12) {
                    Text("Local Network & Ports")
                        .font(.headline)
                    
                    HStack {
                        Text("Local TCP Port:")
                            .font(.subheadline)
                        TextField("Port", text: $downloadPort)
                            .frame(width: 80)
                            .textFieldStyle(.roundedBorder)
                        Spacer()
                    }
                    
                    Toggle("Enable Optional End-to-End Encrypted Cloud Relay", isOn: $enableRemoteRelay)
                    
                    Text("By default, Linkora communicates exclusively peer-to-peer over your local Wi-Fi router. Enabling cloud relay allows encrypted transfers when devices are on different cellular or Wi-Fi networks.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(10)
                
                // Demo / Mock Data Toggle
                VStack(alignment: .leading, spacing: 12) {
                    Text("Simulator & Diagnostics")
                        .font(.headline)
                    
                    Toggle("Demo / Simulation Mode", isOn: $appState.isDemoMode)
                    
                    Text("When enabled, realistic simulated Android and iOS devices are presented to preview all features without requiring physical devices connected.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(10)
            }
            .padding(24)
        }
    }
}
