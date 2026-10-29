import Foundation

public protocol SecurityApprovalManagerDelegate: AnyObject {
    func securityManager(_ manager: SecurityApprovalManager, didIssueChallenge challenge: AuthChallenge)
    func securityManager(_ manager: SecurityApprovalManager, didResolveChallenge challenge: AuthChallenge, success: Bool)
}

public final class SecurityApprovalManager: @unchecked Sendable {
    public static let shared = SecurityApprovalManager()
    
    public weak var delegate: SecurityApprovalManagerDelegate?
    public private(set) var activeChallenges: [String: AuthChallenge] = [:]
    public private(set) var consumedNonces: Set<String> = []
    
    // Trusted phone public keys: [DeviceId: PublicKeyHex]
    public private(set) var trustedDeviceKeys: [String: String] = [:]
    
    private let lock = NSLock()
    
    public init() {}
    
    public func registerTrustedDevice(id: String, publicKeyHex: String) {
        lock.lock()
        defer { lock.unlock() }
        trustedDeviceKeys[id] = publicKeyHex
    }
    
    public func revokeTrustedDevice(id: String) {
        lock.lock()
        defer { lock.unlock() }
        trustedDeviceKeys.removeValue(forKey: id)
    }
    
    public func createChallenge(action: AuthChallengeAction, targetDeviceName: String) -> AuthChallenge {
        let nonce = CryptoEngine.randomNonce(bytes: 32).hexEncodedString
        let challenge = AuthChallenge(
            action: action,
            targetDeviceName: targetDeviceName,
            nonceHex: nonce,
            expiresAt: Date().addingTimeInterval(60)
        )
        
        lock.lock()
        activeChallenges[challenge.id] = challenge
        lock.unlock()
        
        delegate?.securityManager(self, didIssueChallenge: challenge)
        return challenge
    }
    
    public func verifyChallengeResponse(
        challengeId: String,
        deviceId: String,
        biometricType: String,
        signatureHex: String
    ) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        
        guard var challenge = activeChallenges[challengeId] else {
            return false
        }
        
        guard Date() <= challenge.expiresAt else {
            challenge.state = .expired
            activeChallenges[challengeId] = challenge
            delegate?.securityManager(self, didResolveChallenge: challenge, success: false)
            return false
        }
        
        guard !consumedNonces.contains(challenge.nonceHex) else {
            challenge.state = .rejected
            activeChallenges[challengeId] = challenge
            delegate?.securityManager(self, didResolveChallenge: challenge, success: false)
            return false
        }
        
        guard let publicKeyHex = trustedDeviceKeys[deviceId] else {
            challenge.state = .rejected
            activeChallenges[challengeId] = challenge
            delegate?.securityManager(self, didResolveChallenge: challenge, success: false)
            return false
        }
        
        // Data to verify: SHA256(challengeId + nonceHex)
        let payloadString = "\(challenge.id):\(challenge.nonceHex)"
        let payloadData = Data(payloadString.utf8)
        
        let isValid = CryptoEngine.verifySignature(
            data: payloadData,
            signatureHex: signatureHex,
            publicKeyHex: publicKeyHex
        )
        
        consumedNonces.insert(challenge.nonceHex)
        
        if isValid {
            challenge.state = .approved
            challenge.biometricType = biometricType
            challenge.signatureHex = signatureHex
            activeChallenges[challengeId] = challenge
            delegate?.securityManager(self, didResolveChallenge: challenge, success: true)
            return true
        } else {
            challenge.state = .rejected
            activeChallenges[challengeId] = challenge
            delegate?.securityManager(self, didResolveChallenge: challenge, success: false)
            return false
        }
    }
    
    public func lockScreenOrAppSession() {
        // Safe, non-intrusive Mac screen lock via SACLockScreenImmediate
        let libHandle = dlopen("/System/Library/PrivateFrameworks/login.framework/Versions/Current/login", RTLD_LAZY)
        if let handle = libHandle {
            let sym = dlsym(handle, "SACLockScreenImmediate")
            if let lockFunc = sym {
                typealias LockFuncType = @convention(c) () -> Int32
                let lock = unsafeBitCast(lockFunc, to: LockFuncType.self)
                _ = lock()
            }
            dlclose(handle)
        }
    }
}
