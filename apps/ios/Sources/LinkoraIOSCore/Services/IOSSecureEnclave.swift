import Foundation
import CryptoKit
import LocalAuthentication

public final class IOSSecureEnclave: @unchecked Sendable {
    public static let shared = IOSSecureEnclave()
    
    public init() {}
    
    public func authenticateAndSign(
        challengeData: Data,
        reason: String = "Approve Mac unlock request",
        completion: @escaping (Result<Data, Error>) -> Void
    ) {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"
        
        var authError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            // Fallback to device passcode if biometrics not enrolled
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
                if success {
                    self.signChallenge(data: challengeData, completion: completion)
                } else {
                    completion(.failure(error ?? NSError(domain: "LinkoraIOS", code: 1, userInfo: nil)))
                }
            }
            return
        }
        
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            if success {
                self.signChallenge(data: challengeData, completion: completion)
            } else {
                completion(.failure(error ?? NSError(domain: "LinkoraIOS", code: 2, userInfo: nil)))
            }
        }
    }
    
    private func signChallenge(data: Data, completion: @escaping (Result<Data, Error>) -> Void) {
        do {
            // Check if Secure Enclave is available on this hardware
            if SecureEnclave.isAvailable {
                let accessControl = SecAccessControlCreateWithFlags(
                    nil,
                    kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
                    [.privateKeyUsage, .biometryAny],
                    nil
                )!
                let privateKey = try SecureEnclave.P256.Signing.PrivateKey(accessControl: accessControl)
                let signature = try privateKey.signature(for: data)
                completion(.success(signature.rawRepresentation))
            } else {
                // Fallback to standard P-256 software key
                let privateKey = P256.Signing.PrivateKey()
                let signature = try privateKey.signature(for: data)
                completion(.success(signature.rawRepresentation))
            }
        } catch {
            completion(.failure(error))
        }
    }
}
