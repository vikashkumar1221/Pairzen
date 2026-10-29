import Foundation

public enum AuthChallengeAction: String, Codable, Sendable {
    case macScreenUnlock = "mac_screen_unlock"
    case privilegedAction = "privileged_action"
    case fileAccess = "file_access"
}

public enum AuthChallengeState: String, Codable, Sendable {
    case pending
    case approved
    case rejected
    case expired
}

public struct AuthChallenge: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let action: AuthChallengeAction
    public let targetDeviceName: String
    public let nonceHex: String
    public let createdAt: Date
    public let expiresAt: Date
    public var state: AuthChallengeState
    public var biometricType: String?
    public var signatureHex: String?
    
    public init(
        id: String = UUID().uuidString,
        action: AuthChallengeAction,
        targetDeviceName: String,
        nonceHex: String,
        createdAt: Date = Date(),
        expiresAt: Date = Date().addingTimeInterval(60),
        state: AuthChallengeState = .pending,
        biometricType: String? = nil,
        signatureHex: String? = nil
    ) {
        self.id = id
        self.action = action
        self.targetDeviceName = targetDeviceName
        self.nonceHex = nonceHex
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.state = state
        self.biometricType = biometricType
        self.signatureHex = signatureHex
    }
}
