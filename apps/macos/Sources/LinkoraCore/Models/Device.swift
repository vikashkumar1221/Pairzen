import Foundation

public enum DevicePlatform: String, Codable, Sendable, CaseIterable {
    case macos
    case android
    case ios
    case web
    
    public var displayName: String {
        switch self {
        case .macos: return "macOS"
        case .android: return "Android"
        case .ios: return "iOS"
        case .web: return "Web"
        }
    }
    
    public var systemIcon: String {
        switch self {
        case .macos: return "laptopcomputer"
        case .android: return "phone.fill"
        case .ios: return "iphone"
        case .web: return "globe"
        }
    }
}

public enum ConnectionState: String, Codable, Sendable {
    case disconnected
    case discovering
    case connecting
    case authenticating
    case connected
    case transferring
    case blocked
}

public struct DeviceCapabilities: Codable, Sendable, Equatable {
    public var fileSharing: Bool
    public var clipboardSync: Bool
    public var cameraStream: Bool
    public var remoteInputReceiver: Bool
    public var remoteInputSender: Bool
    public var biometricApproval: Bool
    public var notificationMirroring: Bool
    
    public init(
        fileSharing: Bool = true,
        clipboardSync: Bool = true,
        cameraStream: Bool = false,
        remoteInputReceiver: Bool = false,
        remoteInputSender: Bool = false,
        biometricApproval: Bool = false,
        notificationMirroring: Bool = false
    ) {
        self.fileSharing = fileSharing
        self.clipboardSync = clipboardSync
        self.cameraStream = cameraStream
        self.remoteInputReceiver = remoteInputReceiver
        self.remoteInputSender = remoteInputSender
        self.biometricApproval = biometricApproval
        self.notificationMirroring = notificationMirroring
    }
}

public struct BatteryStatus: Codable, Sendable, Equatable {
    public var level: Double // 0.0 to 1.0
    public var isCharging: Bool
    public var isLowPowerMode: Bool?
    
    public init(level: Double, isCharging: Bool, isLowPowerMode: Bool? = nil) {
        self.level = level
        self.isCharging = isCharging
        self.isLowPowerMode = isLowPowerMode
    }
}

public struct DiscoveredDevice: Identifiable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let host: String
    public let port: Int
    public let platform: DevicePlatform
    public let lastSeen: Date
    
    public init(id: String, name: String, host: String, port: Int, platform: DevicePlatform, lastSeen: Date = Date()) {
        self.id = id
        self.name = name
        self.host = host
        self.port = port
        self.platform = platform
        self.lastSeen = lastSeen
    }
}

public struct Device: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public var name: String
    public let platform: DevicePlatform
    public var model: String
    public var osVersion: String
    public var appVersion: String
    public var isTrusted: Bool
    public var connectionState: ConnectionState
    public var capabilities: DeviceCapabilities
    public var battery: BatteryStatus?
    public var lastSeen: Date
    public var ipAddress: String?
    public var publicKeyHex: String?
    
    public init(
        id: String,
        name: String,
        platform: DevicePlatform,
        model: String = "Generic Device",
        osVersion: String = "Unknown",
        appVersion: String = "1.0.0",
        isTrusted: Bool = false,
        connectionState: ConnectionState = .disconnected,
        capabilities: DeviceCapabilities = DeviceCapabilities(),
        battery: BatteryStatus? = nil,
        lastSeen: Date = Date(),
        ipAddress: String? = nil,
        publicKeyHex: String? = nil
    ) {
        self.id = id
        self.name = name
        self.platform = platform
        self.model = model
        self.osVersion = osVersion
        self.appVersion = appVersion
        self.isTrusted = isTrusted
        self.connectionState = connectionState
        self.capabilities = capabilities
        self.battery = battery
        self.lastSeen = lastSeen
        self.ipAddress = ipAddress
        self.publicKeyHex = publicKeyHex
    }
}
