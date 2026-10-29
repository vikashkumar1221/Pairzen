import SwiftUI
import LinkoraCore

struct PairingSheet: View {
    @EnvironmentObject var appState: LinkoraAppState
    @Environment(\.dismiss) var dismiss
    
    @State private var manualHost: String = ""
    @State private var manualPort: String = "8765"
    @State private var selectedTab: Int = 0
    
    var body: some View {
        VStack(spacing: 20) {
            HStack {
                Text("Pair a New Device")
                    .font(.title3.bold())
                Spacer()
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                        .font(.title3)
                }
                .buttonStyle(.plain)
            }
            
            Picker("", selection: $selectedTab) {
                Text("QR Code").tag(0)
                Text("Short Code (SAS)").tag(1)
                Text("Manual IP").tag(2)
            }
            .pickerStyle(.segmented)
            
            if selectedTab == 0 {
                VStack(spacing: 16) {
                    // Stylized QR container
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white)
                            .frame(width: 180, height: 180)
                            .shadow(color: .black.opacity(0.1), radius: 8)
                        
                        VStack(spacing: 8) {
                            Image(systemName: "qrcode")
                                .font(.system(size: 110))
                                .foregroundColor(.black)
                            Text("SCAN WITH PHONE")
                                .font(.system(size: 9, weight: .black, design: .monospaced))
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Text("Open Linkora on your Android or iPhone and point the scanner at this screen.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 280)
                }
                .padding(.vertical, 10)
            } else if selectedTab == 1 {
                VStack(spacing: 14) {
                    Text("Verification Short Code")
                        .font(.headline)
                    Text("Confirm this 6-digit number matches on both devices to prevent man-in-the-middle attacks.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    HStack(spacing: 8) {
                        ForEach(Array(appState.activeSasCode), id: \.self) { char in
                            Text(String(char))
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .frame(width: 36, height: 48)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(8)
                        }
                    }
                    .padding(.vertical, 8)
                }
            } else {
                VStack(spacing: 12) {
                    Text("Connect via Local IP")
                        .font(.headline)
                    Text("Use this fallback if Bonjour / mDNS is blocked by your Wi-Fi router.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    TextField("Device IP Address (e.g. 192.168.1.140)", text: $manualHost)
                        .textFieldStyle(.roundedBorder)
                    TextField("Port", text: $manualPort)
                        .textFieldStyle(.roundedBorder)
                    
                    Button("Initiate Direct Handshake") {
                        if let port = UInt16(manualPort), !manualHost.isEmpty {
                            appState.transport.connect(host: manualHost, port: port)
                            dismiss()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(manualHost.isEmpty)
                }
                .frame(maxWidth: 320)
                .padding(.vertical, 10)
            }
            
            Divider()
            
            HStack {
                Image(systemName: "lock.shield")
                    .foregroundColor(.secondary)
                Text("Zero-Knowledge Local Pairing • No Cloud Account Required")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(24)
        .frame(width: 440)
    }
}
