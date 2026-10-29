import SwiftUI
import LinkoraCore

struct DevicesView: View {
    @EnvironmentObject var appState: LinkoraAppState
    @State private var selectedDeviceForDetails: Device?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Paired Devices")
                            .font(.title2.bold())
                        Text("Manage trusted Android and iOS devices connected to this Mac.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Pair New Device") {
                        appState.isPairingSheetPresented = true
                    }
                    .buttonStyle(.borderedProminent)
                }
                
                ForEach(appState.devices) { device in
                    DeviceDetailCard(device: device) {
                        appState.revokeDevice(id: device.id)
                    }
                }
            }
            .padding(24)
        }
    }
}

struct DeviceDetailCard: View {
    let device: Device
    let onRevoke: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                Image(systemName: device.platform.systemIcon)
                    .font(.system(size: 28))
                    .foregroundColor(device.platform == .android ? .green : .blue)
                    .frame(width: 44, height: 44)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(device.name)
                            .font(.headline)
                        if device.isTrusted {
                            Label("Trusted", systemImage: "checkmark.shield.fill")
                                .font(.caption2)
                                .foregroundColor(.green)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.green.opacity(0.12))
                                .cornerRadius(4)
                        }
                    }
                    Text("\(device.model) • \(device.osVersion)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let ip = device.ipAddress {
                        Text("IP: \(ip):8765")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 8) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(device.connectionState == .connected ? Color.green : Color.orange)
                            .frame(width: 8, height: 8)
                        Text(device.connectionState.rawValue.capitalized)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    
                    Button(role: .destructive, action: onRevoke) {
                        Text("Revoke Trust")
                            .font(.caption)
                    }
                    .buttonStyle(.bordered)
                }
            }
            
            Divider()
            
            // Capabilities Checklist
            VStack(alignment: .leading, spacing: 8) {
                Text("Enabled Capabilities")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180))], spacing: 8) {
                    CapabilityBadge(label: "File Sharing", icon: "doc.fill", enabled: device.capabilities.fileSharing)
                    CapabilityBadge(label: "Clipboard Sync", icon: "doc.on.clipboard", enabled: device.capabilities.clipboardSync)
                    CapabilityBadge(label: "Camera Stream", icon: "camera.fill", enabled: device.capabilities.cameraStream)
                    CapabilityBadge(label: "Biometric Approval", icon: "faceid", enabled: device.capabilities.biometricApproval)
                    CapabilityBadge(label: "Notification Mirror", icon: "bell.fill", enabled: device.capabilities.notificationMirroring)
                }
            }
        }
        .padding(18)
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
        )
    }
}

struct CapabilityBadge: View {
    let label: String
    let icon: String
    let enabled: Bool
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(enabled ? .green : .secondary)
            Text(label)
                .font(.caption)
                .foregroundColor(enabled ? .primary : .secondary)
            Spacer()
            Image(systemName: enabled ? "checkmark" : "xmark")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(enabled ? .green : .secondary.opacity(0.5))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.08))
        .cornerRadius(6)
    }
}
