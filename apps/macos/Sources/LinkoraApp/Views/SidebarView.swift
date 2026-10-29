import SwiftUI
import LinkoraCore

struct SidebarView: View {
    @Binding var selectedTab: NavigationTab
    @EnvironmentObject var appState: LinkoraAppState
    
    var body: some View {
        List(NavigationTab.allCases, selection: $selectedTab) { tab in
            NavigationLink(value: tab) {
                Label {
                    HStack {
                        Text(tab.rawValue)
                        Spacer()
                        if tab == .devices && !appState.devices.isEmpty {
                            Text("\(appState.devices.count)")
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 1)
                                .background(Color.secondary.opacity(0.2))
                                .clipShape(Capsule())
                        }
                    }
                } icon: {
                    Image(systemName: tab.iconName)
                        .foregroundColor(.accentColor)
                }
            }
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .bottom) {
            VStack(alignment: .leading, spacing: 6) {
                Divider()
                HStack(spacing: 8) {
                    Circle()
                        .fill(appState.connectedDevices.isEmpty ? Color.gray : Color.green)
                        .frame(width: 8, height: 8)
                    Text(appState.connectedDevices.isEmpty ? "No device connected" : "\(appState.connectedDevices.count) connected")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
            }
        }
    }
}
