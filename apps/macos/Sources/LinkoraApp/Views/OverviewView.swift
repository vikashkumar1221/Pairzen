import SwiftUI
import LinkoraCore

struct OverviewView: View {
    @EnvironmentObject var appState: LinkoraAppState
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Friendly Greeting & Ecosystem Status
                VStack(alignment: .leading, spacing: 6) {
                    Text("Welcome to Linkora")
                        .font(.system(size: 26, weight: .bold))
                    Text("Your MacBook is securely synchronized with your connected mobile devices.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Active Connected Devices Cards
                VStack(alignment: .leading, spacing: 12) {
                    Text("Connected Devices")
                        .font(.headline)
                    
                    if appState.devices.isEmpty {
                        EmptyDevicesView()
                    } else {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 320), spacing: 16)], spacing: 16) {
                            ForEach(appState.devices) { device in
                                DeviceCardView(device: device)
                            }
                        }
                    }
                }
                
                // Quick Action Bar
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick Actions")
                        .font(.headline)
                    
                    HStack(spacing: 12) {
                        QuickActionButton(title: "Share Files", icon: "arrow.up.and.down.circle.fill", color: .blue) {
                            appState.selectedTab = .fileSharing
                        }
                        QuickActionButton(title: "Camera View", icon: "camera.viewfinder", color: .indigo) {
                            appState.selectedTab = .camera
                        }
                        QuickActionButton(title: "Remote Input", icon: "cursorarrow.rays", color: .purple) {
                            appState.selectedTab = .remoteControl
                        }
                        QuickActionButton(title: "Biometric Auth", icon: "lock.shield.fill", color: .teal) {
                            appState.selectedTab = .security
                        }
                    }
                }
                
                // Recent Activity Feed
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Recent Activity")
                            .font(.headline)
                        Spacer()
                        Button("View All") {
                            appState.selectedTab = .activity
                        }
                        .font(.caption)
                    }
                    
                    VStack(spacing: 8) {
                        ForEach(appState.recentActivity.prefix(4)) { entry in
                            ActivityRow(entry: entry)
                        }
                    }
                    .padding(12)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .cornerRadius(10)
                }
            }
            .padding(24)
        }
    }
}

struct DeviceCardView: View {
    let device: Device
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(device.platform == .android ? Color.green.opacity(0.12) : Color.blue.opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: device.platform.systemIcon)
                        .font(.system(size: 20))
                        .foregroundColor(device.platform == .android ? .green : .blue)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(device.name)
                        .font(.system(size: 15, weight: .semibold))
                    Text(device.model)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    Circle()
                        .fill(device.connectionState == .connected ? Color.green : Color.orange)
                        .frame(width: 8, height: 8)
                    Text(device.connectionState.rawValue.capitalized)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)
            }
            
            Divider()
            
            // Battery & Capabilities
            HStack {
                if let battery = device.battery {
                    HStack(spacing: 4) {
                        Image(systemName: battery.isCharging ? "battery.100.bolt" : "battery.75")
                            .foregroundColor(battery.level > 0.2 ? .green : .red)
                        Text("\(Int(battery.level * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                HStack(spacing: 6) {
                    if device.capabilities.fileSharing {
                        CapabilityIcon(icon: "doc.fill", label: "Files")
                    }
                    if device.capabilities.clipboardSync {
                        CapabilityIcon(icon: "doc.on.clipboard", label: "Clipboard")
                    }
                    if device.capabilities.cameraStream {
                        CapabilityIcon(icon: "camera.fill", label: "Camera")
                    }
                    if device.capabilities.biometricApproval {
                        CapabilityIcon(icon: "faceid", label: "Biometrics")
                    }
                }
            }
        }
        .padding(16)
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.secondary.opacity(0.15), lineWidth: 1)
        )
    }
}

struct CapabilityIcon: View {
    let icon: String
    let label: String
    
    var body: some View {
        Image(systemName: icon)
            .font(.caption2)
            .foregroundColor(.secondary)
            .help(label)
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(color)
                Text(title)
                    .font(.system(size: 13, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.secondary.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct ActivityRow: View {
    let entry: ActivityEntry
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: entry.icon)
                .foregroundColor(.accentColor)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.title)
                    .font(.system(size: 13, weight: .semibold))
                Text(entry.details)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text(entry.timestamp, style: .time)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct EmptyDevicesView: View {
    @EnvironmentObject var appState: LinkoraAppState
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "iphone.and.arrow.forward")
                .font(.system(size: 36))
                .foregroundColor(.secondary)
            Text("No Paired Devices")
                .font(.headline)
            Text("Click 'Pair Device' in the toolbar to scan a QR code from your phone.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            Button("Pair First Device") {
                appState.isPairingSheetPresented = true
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}
