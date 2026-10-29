import SwiftUI
import LinkoraCore

public struct MobileMainView: View {
    @State private var selectedTab = 0
    @State private var isConnected = true
    @State private var macName = "Vikash's MacBook Pro"
    @State private var isFaceIDPromptPresented = false
    @State private var biometricStatus = "Ready"
    
    public init() {}
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            // Home / Ecosystem Tab
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        // Mac Connection Banner
                        HStack(spacing: 14) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.blue.opacity(0.12))
                                    .frame(width: 48, height: 48)
                                Image(systemName: "laptopcomputer")
                                    .font(.system(size: 24))
                                    .foregroundColor(.blue)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(macName)
                                    .font(.headline)
                                Text("Local Wi-Fi • E2EE Active")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(isConnected ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)
                                Text(isConnected ? "Connected" : "Offline")
                                    .font(.caption2.bold())
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .padding(16)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(16)
                        
                        Text("Continuity Actions")
                            .font(.headline)
                        
                        // Action Grid
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                            MobileActionTile(title: "Share Photos", icon: "photo.on.rectangle.angled", color: .blue) {
                                selectedTab = 1
                            }
                            MobileActionTile(title: "Webcam Mode", icon: "camera.viewfinder", color: .indigo) {
                                selectedTab = 2
                            }
                            MobileActionTile(title: "Trackpad", icon: "hand.tap.fill", color: .teal) {
                                selectedTab = 3
                            }
                            MobileActionTile(title: "Face ID Unlock", icon: "faceid", color: .purple) {
                                selectedTab = 4
                            }
                        }
                    }
                    .padding(18)
                }
                .navigationTitle("Linkora")
            }
            .tabItem {
                Label("Home", systemImage: "macbook.and.iphone")
            }
            .tag(0)
            
            // Files Tab
            NavigationStack {
                VStack(spacing: 20) {
                    Image(systemName: "arrow.up.and.down.circle")
                        .font(.system(size: 50))
                        .foregroundColor(.blue)
                    Text("Select Photos & Files to Send")
                        .font(.headline)
                    Text("Direct peer-to-peer transmission over local Wi-Fi without uploading to any cloud.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    
                    Button("Open Photo Picker") {
                        // Open PHPickerViewController
                    }
                    .buttonStyle(.borderedProminent)
                }
                .navigationTitle("Files & Photos")
            }
            .tabItem {
                Label("Files", systemImage: "folder.fill")
            }
            .tag(1)
            
            // Camera Tab
            NavigationStack {
                VStack(spacing: 20) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.black)
                            .frame(height: 320)
                        VStack(spacing: 10) {
                            Image(systemName: "video.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white.opacity(0.8))
                            Text("1080p 60FPS Video Stream")
                                .font(.headline)
                                .foregroundColor(.white)
                            Text("Broadcasting to \(macName)")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.horizontal, 16)
                    
                    HStack(spacing: 16) {
                        Button("Switch Camera") {}
                            .buttonStyle(.bordered)
                        Button("Torch Toggle") {}
                            .buttonStyle(.bordered)
                    }
                }
                .navigationTitle("Camera as Webcam")
            }
            .tabItem {
                Label("Camera", systemImage: "video.fill")
            }
            .tag(2)
            
            // Trackpad Tab
            NavigationStack {
                VStack(spacing: 16) {
                    Text("Multitouch Mac Pointer")
                        .font(.headline)
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(.secondarySystemBackground))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        VStack(spacing: 8) {
                            Image(systemName: "hand.point.up.left.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.secondary)
                            Text("Trackpad Surface")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(16)
                }
                .navigationTitle("Trackpad")
            }
            .tabItem {
                Label("Trackpad", systemImage: "hand.tap.fill")
            }
            .tag(3)
            
            // Security Tab
            NavigationStack {
                VStack(spacing: 20) {
                    Image(systemName: "faceid")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                    Text("Secure Enclave Biometric Approval")
                        .font(.title3.bold())
                    Text("Your private key never leaves the Secure Enclave. Linkora signs a fresh challenge nonce whenever requested by your Mac.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    
                    Text("Status: \(biometricStatus)")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                    
                    Button("Approve Mac Screen Challenge") {
                        biometricStatus = "Prompting Face ID…"
                        IOSSecureEnclave.shared.authenticateAndSign(
                            challengeData: Data("ChallengeNonceSample".utf8)
                        ) { result in
                            DispatchQueue.main.async {
                                switch result {
                                case .success:
                                    self.biometricStatus = "Signed & Approved via Face ID!"
                                case .failure(let err):
                                    self.biometricStatus = "Failed: \(err.localizedDescription)"
                                }
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(24)
                .navigationTitle("Security")
            }
            .tabItem {
                Label("Security", systemImage: "lock.shield.fill")
            }
            .tag(4)
        }
    }
}

struct MobileActionTile: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(color.opacity(0.12))
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .foregroundColor(color)
                        .font(.system(size: 18))
                }
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(14)
        }
    }
}
