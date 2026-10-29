import Foundation
import CryptoKit

public final class CryptoEngine: @unchecked Sendable {
    public static let shared = CryptoEngine()
    
    // Ephemeral or Keychain-backed private key
    private let privateKey: P256.KeyAgreement.PrivateKey
    public let publicKeyHex: String
    
    public init() {
        self.privateKey = P256.KeyAgreement.PrivateKey()
        self.publicKeyHex = privateKey.publicKey.rawRepresentation.map { String(format: "%02x", $0) }.joined()
    }
    
    public static func randomNonce(bytes: Int = 32) -> Data {
        var data = Data(count: bytes)
        _ = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, bytes, $0.baseAddress!) }
        return data
    }
    
    public static func sha256(_ data: Data) -> Data {
        let digest = SHA256.hash(data: data)
        return Data(digest)
    }
    
    public static func sha256Hex(_ data: Data) -> String {
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
    
    public func deriveSharedSecret(peerPublicKeyHex: String) throws -> SymmetricKey {
        guard let peerKeyData = Data(hexString: peerPublicKeyHex) else {
            throw NSError(domain: "LinkoraCrypto", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid peer public key hex"])
        }
        let peerPublicKey = try P256.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)
        let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data("LinkoraKeyExchangeSalt".utf8),
            sharedInfo: Data("LinkoraSessionKey".utf8),
            outputByteCount: 32
        )
    }
    
    public static func deriveSASCode(senderNonce: Data, responderNonce: Data, sharedSecret: Data? = nil) -> String {
        var combined = Data()
        combined.append(senderNonce)
        combined.append(responderNonce)
        if let secret = sharedSecret {
            combined.append(secret)
        }
        
        let hash = SHA256.hash(data: combined)
        let hashData = Data(hash)
        let value = hashData.prefix(4).withUnsafeBytes { $0.load(as: UInt32.self).bigEndian }
        let code = value % 1_000_000
        return String(format: "%06d", code)
    }
    
    public static func encrypt(data: Data, key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.seal(data, using: key)
        guard let combined = sealedBox.combined else {
            throw NSError(domain: "LinkoraCrypto", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to seal AES-GCM data"])
        }
        return combined
    }
    
    public static func decrypt(data: Data, key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: key)
    }
    
    public static func verifySignature(
        data: Data,
        signatureHex: String,
        publicKeyHex: String
    ) -> Bool {
        guard let sigData = Data(hexString: signatureHex),
              let pubData = Data(hexString: publicKeyHex) else {
            return false
        }
        
        do {
            let key = try P256.Signing.PublicKey(rawRepresentation: pubData)
            let signature = try P256.Signing.ECDSASignature(rawRepresentation: sigData)
            return key.isValidSignature(signature, for: data)
        } catch {
            return false
        }
    }
}

extension Data {
    public init?(hexString: String) {
        let clean = hexString.replacingOccurrences(of: " ", with: "")
        guard clean.count % 2 == 0 else { return nil }
        var data = Data(capacity: clean.count / 2)
        var index = clean.startIndex
        while index < clean.endIndex {
            let nextIndex = clean.index(index, offsetBy: 2)
            guard let byte = UInt8(clean[index..<nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }
        self = data
    }
    
    public var hexEncodedString: String {
        return map { String(format: "%02x", $0) }.joined()
    }
}
