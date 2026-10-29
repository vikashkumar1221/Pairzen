import XCTest
import CryptoKit
@testable import LinkoraCore

final class LinkoraCoreTests: XCTestCase {
    
    func testProtocolFramingEncodeDecode() throws {
        let payloadString = "{\"action\":\"test\",\"value\":123}"
        let payloadData = Data(payloadString.utf8)
        
        let frame = ProtocolFraming.encode(type: .ping, payload: payloadData)
        XCTAssertEqual(frame.count, FrameConstants.headerSize + payloadData.count)
        
        let header = try ProtocolFraming.decodeHeader(data: frame)
        XCTAssertEqual(header.magic, FrameConstants.magic)
        XCTAssertEqual(header.version, FrameConstants.version)
        XCTAssertEqual(header.messageType, .ping)
        XCTAssertEqual(header.payloadLength, UInt32(payloadData.count))
    }
    
    func testStreamFrameAccumulator() throws {
        let acc = StreamFrameAccumulator()
        let payload1 = Data("first_payload".utf8)
        let payload2 = Data("second_payload".utf8)
        
        let frame1 = ProtocolFraming.encode(type: .ping, payload: payload1)
        let frame2 = ProtocolFraming.encode(type: .pong, payload: payload2)
        
        var combined = Data()
        combined.append(frame1)
        combined.append(frame2)
        
        // Feed partial bytes
        let half = combined.count / 2
        let framesFirst = try acc.append(combined.prefix(half))
        XCTAssertTrue(framesFirst.count <= 1)
        
        let framesSecond = try acc.append(combined.suffix(from: half))
        let total = framesFirst + framesSecond
        
        XCTAssertEqual(total.count, 2)
        XCTAssertEqual(total[0].header.messageType, .ping)
        XCTAssertEqual(total[1].header.messageType, .pong)
        XCTAssertEqual(acc.pendingBytes, 0)
    }
    
    func testCryptoEngineAESGCM() throws {
        let secretKey = SymmetricKey(size: .bits256)
        let message = Data("Confidential Continuity Data".utf8)
        
        let encrypted = try CryptoEngine.encrypt(data: message, key: secretKey)
        XCTAssertNotEqual(encrypted, message)
        
        let decrypted = try CryptoEngine.decrypt(data: encrypted, key: secretKey)
        XCTAssertEqual(decrypted, message)
    }
    
    func testSASCodeDerivation() {
        let nonce1 = Data([1, 2, 3, 4, 5, 6, 7, 8])
        let nonce2 = Data([8, 7, 6, 5, 4, 3, 2, 1])
        
        let sas1 = CryptoEngine.deriveSASCode(senderNonce: nonce1, responderNonce: nonce2)
        let sas2 = CryptoEngine.deriveSASCode(senderNonce: nonce1, responderNonce: nonce2)
        
        XCTAssertEqual(sas1, sas2)
        XCTAssertEqual(sas1.count, 6)
        XCTAssertNotNil(Int(sas1))
    }
    
    func testSecurityApprovalVerification() {
        let manager = SecurityApprovalManager()
        
        // Generate a hardware signing keypair
        let signingKey = P256.Signing.PrivateKey()
        let publicKeyHex = signingKey.publicKey.rawRepresentation.hexEncodedString
        
        let deviceId = "test-phone"
        manager.registerTrustedDevice(id: deviceId, publicKeyHex: publicKeyHex)
        
        let challenge = manager.createChallenge(action: .macScreenUnlock, targetDeviceName: "TestMac")
        XCTAssertEqual(challenge.state, .pending)
        
        // Sign the challenge
        let payloadString = "\(challenge.id):\(challenge.nonceHex)"
        let payloadData = Data(payloadString.utf8)
        let signature = try! signingKey.signature(for: payloadData)
        let sigHex = signature.rawRepresentation.hexEncodedString
        
        let success = manager.verifyChallengeResponse(
            challengeId: challenge.id,
            deviceId: deviceId,
            biometricType: "Face ID",
            signatureHex: sigHex
        )
        
        XCTAssertTrue(success)
        XCTAssertEqual(manager.activeChallenges[challenge.id]?.state, .approved)
        
        // Replay defense test: attempting to verify with the same nonce again should fail
        let replaySuccess = manager.verifyChallengeResponse(
            challengeId: challenge.id,
            deviceId: deviceId,
            biometricType: "Face ID",
            signatureHex: sigHex
        )
        XCTAssertFalse(replaySuccess)
    }
}
