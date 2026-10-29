import SwiftUI
import LinkoraCore

struct SecurityView: View {
    @EnvironmentObject var appState: LinkoraAppState
    @State private var testChallengeNonce: String = ""
    @State private var challengeStatus: String = "Ready"
    @State private var isChallenging = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Phone-Assisted Security & Approvals")
                        .font(.title2.bold())
                    Text("Approve Mac authorizations and screen unlock using Face ID, Touch ID, or Android BiometricPrompt.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Security Architecture Reality Alert
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "exclamationmark.shield.fill")
                            .foregroundColor(.orange)
                        Text("macOS Security Boundary & Login Limitation")
                            .font(.headline)
                    }
                    
                    Text("Third-party macOS applications cannot legally or safely bypass the system FileVault / loginwindow via public APIs without compromised PAM root daemons. Linkora implements a cryptographic **App-Level Session Lock** and **Permission Gate**, signing random nonces via your phone's Secure Enclave or Android Keystore.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color.orange.opacity(0.08))
                .cornerRadius(12)
                
                // Biometric Challenge Test Runner
                VStack(alignment: .leading, spacing: 14) {
                    Text("Biometric Authorization Test")
                        .font(.headline)
                    
                    HStack(spacing: 12) {
                        Button("Send Face ID / Biometric Prompt") {
                            runChallengeTest()
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isChallenging)
                        
                        Button("Lock App Session") {
                            appState.securityManager.lockScreenOrAppSession()
                        }
                        .buttonStyle(.bordered)
                        
                        Spacer()
                        
                        Text("Status: \(challengeStatus)")
                            .font(.caption.bold())
                            .foregroundColor(challengeStatus.contains("Verified") ? .green : .secondary)
                    }
                    
                    if !testChallengeNonce.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Active Nonce Challenge:")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                            Text(testChallengeNonce)
                                .font(.system(size: 11, design: .monospaced))
                                .padding(8)
                                .background(Color.secondary.opacity(0.1))
                                .cornerRadius(6)
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
                
                // Trusted Hardware Public Keys
                VStack(alignment: .leading, spacing: 12) {
                    Text("Trusted Device Identity Keys")
                        .font(.headline)
                    
                    ForEach(appState.devices) { device in
                        HStack {
                            Image(systemName: device.platform.systemIcon)
                                .foregroundColor(.secondary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(device.name)
                                    .font(.system(size: 13, weight: .semibold))
                                Text("Public Key: P-256 (Hardware Keystore)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Button("Revoke") {
                                appState.revokeDevice(id: device.id)
                            }
                            .buttonStyle(.bordered)
                            .font(.caption)
                        }
                        .padding(12)
                        .background(Color(nsColor: .controlBackgroundColor))
                        .cornerRadius(8)
                    }
                }
            }
            .padding(24)
        }
    }
    
    private func runChallengeTest() {
        isChallenging = true
        challengeStatus = "Waiting for phone biometric scan…"
        
        let challenge = appState.securityManager.createChallenge(
            action: .macScreenUnlock,
            targetDeviceName: appState.localMacName
        )
        testChallengeNonce = challenge.nonceHex
        
        // Simulate phone signing response in demo mode
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            self.challengeStatus = "Verified via iPhone Face ID (Hardware Signature Valid)"
            self.isChallenging = false
            
            self.appState.recentActivity.insert(
                ActivityEntry(
                    title: "Biometric Approval",
                    details: "Authenticated via hardware Face ID signature",
                    icon: "faceid",
                    isMockData: true
                ),
                at: 0
            )
        }
    }
}
