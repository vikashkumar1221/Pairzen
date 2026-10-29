import SwiftUI
import LinkoraCore

struct ContentView: View {
    @EnvironmentObject var appState: LinkoraAppState
    
    var body: some View {
        NavigationSplitView {
            SidebarView(selectedTab: $appState.selectedTab)
                .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 280)
        } detail: {
            ZStack {
                Color(nsColor: .windowBackgroundColor)
                    .ignoresSafeArea()
                
                switch appState.selectedTab {
                case .overview:
                    OverviewView()
                case .devices:
                    DevicesView()
                case .fileSharing:
                    FileSharingView()
                case .camera:
                    CameraView()
                case .remoteControl:
                    RemoteControlView()
                case .activity:
                    ActivityView()
                case .security:
                    SecurityView()
                case .settings:
                    SettingsView()
                }
            }
            .toolbar {
                ToolbarItemGroup(placement: .navigation) {
                    if appState.isDemoMode {
                        Text("DEMO SIMULATION ACTIVE")
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.15))
                            .foregroundColor(.orange)
                            .cornerRadius(4)
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button(action: {
                        appState.isPairingSheetPresented = true
                    }) {
                        Label("Pair Device", systemImage: "plus.circle.fill")
                            .font(.headline)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                }
            }
        }
        .sheet(isPresented: $appState.isPairingSheetPresented) {
            PairingSheet()
        }
    }
}
