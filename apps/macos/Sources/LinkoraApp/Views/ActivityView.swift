import SwiftUI
import LinkoraCore

struct ActivityView: View {
    @EnvironmentObject var appState: LinkoraAppState
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Audit & Activity History")
                            .font(.title2.bold())
                        Text("Comprehensive log of all file transfers, clipboard syncs, and security events.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Clear History") {
                        appState.recentActivity.removeAll()
                    }
                    .buttonStyle(.bordered)
                }
                
                VStack(spacing: 8) {
                    ForEach(appState.recentActivity) { entry in
                        HStack(spacing: 14) {
                            Image(systemName: entry.icon)
                                .font(.system(size: 18))
                                .foregroundColor(.accentColor)
                                .frame(width: 24)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                HStack {
                                    Text(entry.title)
                                        .font(.system(size: 14, weight: .semibold))
                                    if entry.isMockData {
                                        Text("SIMULATED")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(.secondary)
                                            .padding(.horizontal, 4)
                                            .background(Color.secondary.opacity(0.1))
                                            .cornerRadius(3)
                                    }
                                }
                                Text(entry.details)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Text(entry.timestamp, style: .time)
                                .font(.caption2)
                                .foregroundColor(.secondary)
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
}
