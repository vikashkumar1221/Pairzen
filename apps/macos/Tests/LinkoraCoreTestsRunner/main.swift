import Foundation
import CryptoKit
import LinkoraCore

func runTests() throws {
    print("========================================")
    print("  LinkoraCore Native Test Suite (macOS)")
    print("========================================")
    
    // Test 1: Framing
    do {
        print("▶ Running: Protocol Framing encode & decode...")
        let payloadString = "{\"action\":\"test\",\"value\":123}"
        let payloadData = Data(payloadString.utf8)
        let frame = ProtocolFraming.encode(type: .ping, payload: payloadData)
        assert(frame.count == FrameConstants.headerSize + payloadData.count, "Frame size mismatch")
        
        let header = try ProtocolFraming.decodeHeader(data: frame)
        assert(header.magic == FrameConstants.magic, "Magic mismatch")
        assert(header.version == FrameConstants.version, "Version mismatch")
        assert(header.messageType == .ping, "Message type mismatch")
        assert(header.payloadLength == UInt32(payloadData.count), "Payload length mismatch")
        print("✔ Protocol Framing: PASSED")
    }
    
    // Test 2: Accumulator
    do {
        print("▶ Running: Stream Frame Accumulator...")
        let acc = StreamFrameAccumulator()
        let p1 = Data("chunk_one".utf8)
        let p2 = Data("chunk_two".utf8)
        let f1 = ProtocolFraming.encode(type: .ping, payload: p1)
        let f2 = ProtocolFraming.encode(type: .pong, payload: p2)
        
        var combined = Data()
        combined.append(f1)
        combined.append(f2)
        
        let half = combined.count / 2
        let r1 = try acc.append(combined.prefix(half))
        let r2 = try acc.append(combined.suffix(from: half))
        let total = r1 + r2
        
        assert(total.count == 2, "Expected 2 frames")
        assert(total[0].header.messageType == .ping, "Frame 0 mismatch")
        assert(total[1].header.messageType == .pong, "Frame 1 mismatch")
        assert(acc.pendingBytes == 0, "Buffer should be empty")
        print("✔ Stream Frame Accumulator: PASSED")
    }
    
    // Test 3: Crypto AES-GCM
    do {
        print("▶ Running: Crypto AES-GCM 256-bit encryption & decryption...")
        let secretKey = SymmetricKey(size: .bits256)
        let rawMessage = Data("Linkora Secure Continuity Payload".utf8)
        let encrypted = try CryptoEngine.encrypt(data: rawMessage, key: secretKey)
        assert(encrypted != rawMessage, "Ciphertext should not match plaintext")
        
        let decrypted = try CryptoEngine.decrypt(data: encrypted, key: secretKey)
        assert(decrypted == rawMessage, "Decrypted message must match original")
        print("✔ Crypto AES-GCM: PASSED")
    }
    
    // Test 4: SAS derivation
    do {
        print("▶ Running: SAS 6-digit short code derivation...")
        let nonceA = Data([10, 20, 30, 40, 50, 60, 70, 80])
        let nonceB = Data([80, 70, 60, 50, 40, 30, 20, 10])
        let code1 = CryptoEngine.deriveSASCode(senderNonce: nonceA, responderNonce: nonceB)
        let code2 = CryptoEngine.deriveSASCode(senderNonce: nonceA, responderNonce: nonceB)
        assert(code1 == code2, "SAS code must be deterministic")
        assert(code1.count == 6, "SAS code must be 6 digits")
        print("✔ SAS Code (\(code1)): PASSED")
    }
    
    // Test 5: Biometric Challenge & Replay Defense
    do {
        print("▶ Running: Biometric Challenge Signing & Replay Defense...")
        let manager = SecurityApprovalManager()
        let signingKey = P256.Signing.PrivateKey()
        let pubKeyHex = signingKey.publicKey.rawRepresentation.hexEncodedString
        let phoneId = "pixel-9-pro"
        
        manager.registerTrustedDevice(id: phoneId, publicKeyHex: pubKeyHex)
        let challenge = manager.createChallenge(action: .macScreenUnlock, targetDeviceName: "MacBookPro")
        assert(challenge.state == .pending, "Challenge must start pending")
        
        let payloadString = "\(challenge.id):\(challenge.nonceHex)"
        let payloadData = Data(payloadString.utf8)
        let signature = try signingKey.signature(for: payloadData)
        let sigHex = signature.rawRepresentation.hexEncodedString
        
        let verified = manager.verifyChallengeResponse(
            challengeId: challenge.id,
            deviceId: phoneId,
            biometricType: "BiometricPrompt",
            signatureHex: sigHex
        )
        assert(verified, "Biometric signature verification must pass")
        
        // Replay defense test: reusing same nonce must fail
        let replay = manager.verifyChallengeResponse(
            challengeId: challenge.id,
            deviceId: phoneId,
            biometricType: "BiometricPrompt",
            signatureHex: sigHex
        )
        assert(!replay, "Replay attack must be blocked")
        print("✔ Biometric Challenge & Replay Defense: PASSED")
    }
    
    print("========================================")
    print("  ALL NATIVE LINKORA MAC TESTS PASSED!  ")
    print("========================================")
}

try runTests()
