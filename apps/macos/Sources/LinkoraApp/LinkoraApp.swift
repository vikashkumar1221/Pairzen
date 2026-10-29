import SwiftUI
import LinkoraCore

@main
struct LinkoraApp: App {
    @StateObject private var appState = LinkoraAppState.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .frame(minWidth: 920, minHeight: 640)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
    }
}
