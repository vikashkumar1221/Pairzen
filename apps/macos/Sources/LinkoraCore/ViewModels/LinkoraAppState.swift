import Foundation
import Combine

public enum NavigationTab: String, CaseIterable, Identifiable, Sendable {
    case overview = "Overview"
    case devices = "Devices"
    case fileSharing = "File Sharing"
    case camera = "Camera"
    case remoteControl = "Remote Control"
    case activity = "Activity"
    case security = "Security"
    case settings = "Settings"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .overview: return "square.grid.2x2"
        case .devices: return "iphone.and.arrow.forward"
        case .fileSharing: return "arrow.up.and.down.circle"
        case .camera: return "camera.viewfinder"
        case .remoteControl: return "cursorarrow.rays"
        case .activity: return "clock.arrow.circlepath"
        case .security: return "lock.shield"
        case .settings: return "gearshape"
        }
    }
}

public struct ActivityEntry: Identifiable, Codable, Sendable {
    public let id: String
    public let timestamp: Date
    public let title: String
    public let details: String
    public let icon: String
    public let isMockData: Bool
    
    public init(id: String = UUID().uuidString, timestamp: Date = Date(), title: String, details: String, icon: String, isMockData: Bool = false) {
        self.id = id
        self.timestamp = timestamp
        self.title = title
        self.details = details
        self.icon = icon
        self.isMockData = isMockData
    }
}

@MainActor
public final class LinkoraAppState: ObservableObject {
    public static let shared = LinkoraAppState()
    
    @Published public var selectedTab: NavigationTab = .overview
    @Published public var devices: [Device] = []
    @Published public var selectedDeviceId: String?
    @Published public var transfers: [TransferItem] = []
    @Published public var recentActivity: [ActivityEntry] = []
    @Published public var isPairingSheetPresented: Bool = false
    @Published public var isDemoMode: Bool = true // Clearly flags mock vs live
    @Published public var localMacName: String = Host.current().localizedName ?? "MacBook Pro"
    @Published public var activeSasCode: String = "482910"
    
    // Services
    public let discoveryService = DiscoveryService()
    public let transport = NetworkTransport()
    public let fileEngine = FileTransferEngine()
    public let clipboardEngine = ClipboardSyncEngine()
    public let remoteInputController = RemoteInputController()
    public let virtualCamera = VirtualCameraController()
    public let securityManager = SecurityApprovalManager()
    
    public init() {
        loadInitialDevices()
    }
    
    public var connectedDevices: [Device] {
        devices.filter { $0.connectionState == .connected }
    }
    
    public var selectedDevice: Device? {
        guard let id = selectedDeviceId else { return devices.first }
        return devices.first { $0.id == id }
    }
    
    public func loadInitialDevices() {
        // High fidelity mock devices clearly labeled as simulated demo data
        devices = [
            Device(
                id: "dev-pixel-9",
                name: "Google Pixel 9 Pro",
                platform: .android,
                model: "Pixel 9 Pro (Android 15)",
                osVersion: "Android 15.0",
                appVersion: "1.0.0",
                isTrusted: true,
                connectionState: .connected,
                capabilities: DeviceCapabilities(
                    fileSharing: true,
                    clipboardSync: true,
                    cameraStream: true,
                    remoteInputReceiver: false,
                    remoteInputSender: true,
                    biometricApproval: true,
                    notificationMirroring: true
                ),
                battery: BatteryStatus(level: 0.84, isCharging: false),
                ipAddress: "192.168.1.142"
            ),
            Device(
                id: "dev-iphone-16",
                name: "Vikash's iPhone 16 Pro",
                platform: .ios,
                model: "iPhone 16 Pro (iOS 18.1)",
                osVersion: "iOS 18.1",
                appVersion: "1.0.0",
                isTrusted: true,
                connectionState: .connected,
                capabilities: DeviceCapabilities(
                    fileSharing: true,
                    clipboardSync: true,
                    cameraStream: true,
                    remoteInputReceiver: false,
                    remoteInputSender: true,
                    biometricApproval: true,
                    notificationMirroring: false // Honest iOS limitation
                ),
                battery: BatteryStatus(level: 0.92, isCharging: true),
                ipAddress: "192.168.1.189"
            )
        ]
        
        selectedDeviceId = devices.first?.id
        
        // Initial realistic transfer queue items
        transfers = [
            TransferItem(
                id: "t-1",
                fileName: "Design_System_Spec.pdf",
                fileSizeBytes: 14_850_000,
                direction: .incoming,
                state: .completed,
                bytesTransferred: 14_850_000,
                sha256Expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                sha256Verified: true,
                speedBytesPerSec: 28_400_000,
                completedAt: Date().addingTimeInterval(-320)
            ),
            TransferItem(
                id: "t-2",
                fileName: "IMG_4829_RAW.heic",
                fileSizeBytes: 24_300_000,
                direction: .outgoing,
                state: .completed,
                bytesTransferred: 24_300_000,
                sha256Expected: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
                sha256Verified: true,
                speedBytesPerSec: 32_100_000,
                completedAt: Date().addingTimeInterval(-1200)
            )
        ]
        
        // Recent activity audit entries
        recentActivity = [
            ActivityEntry(
                title: "File Received",
                details: "Received Design_System_Spec.pdf from Google Pixel 9 Pro",
                icon: "arrow.down.doc",
                isMockData: true
            ),
            ActivityEntry(
                title: "Clipboard Synchronized",
                details: "Synced link to clipboard: https://developer.apple.com",
                icon: "doc.on.clipboard",
                isMockData: true
            ),
            ActivityEntry(
                title: "Biometric Approval Verified",
                details: "Face ID approval signed for Screen Session by iPhone 16 Pro",
                icon: "faceid",
                isMockData: true
            )
        ]
    }
    
    public func addTransfer(_ item: TransferItem) {
        transfers.insert(item, at: 0)
    }
    
    public func revokeDevice(id: String) {
        devices.removeAll { $0.id == id }
        securityManager.revokeTrustedDevice(id: id)
        if selectedDeviceId == id {
            selectedDeviceId = devices.first?.id
        }
        recentActivity.insert(
            ActivityEntry(
                title: "Device Revoked",
                details: "Device ID \(id) untrusted and revoked",
                icon: "trash",
                isMockData: false
            ),
            at: 0
        )
    }
}
