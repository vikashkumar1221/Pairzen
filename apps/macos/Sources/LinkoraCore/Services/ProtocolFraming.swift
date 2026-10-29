import Foundation

public struct FrameConstants {
    public static let magic: UInt32 = 0x4C4E4B52 // "LNKR"
    public static let version: UInt16 = 1
    public static let headerSize = 12
}

public enum MessageType: UInt16, Codable, Sendable {
    case handshakeInit = 0x0001
    case handshakeAck = 0x0002
    case handshakeConfirm = 0x0003
    case ping = 0x0010
    case pong = 0x0011
    case deviceStatus = 0x0020
    case clipboardSync = 0x0030
    case fileTransferRequest = 0x0040
    case fileTransferAccept = 0x0041
    case fileTransferReject = 0x0042
    case fileTransferChunk = 0x0043
    case fileTransferComplete = 0x0044
    case fileTransferCancel = 0x0045
    case cameraStreamStart = 0x0050
    case cameraStreamStop = 0x0051
    case cameraFrame = 0x0052
    case remoteInputEvent = 0x0060
    case authChallengeRequest = 0x0070
    case authChallengeResponse = 0x0071
    case notificationEvent = 0x0080
    case errorResponse = 0x00FF
}

public struct FrameHeader: Sendable, Equatable {
    public let magic: UInt32
    public let version: UInt16
    public let messageType: MessageType
    public let payloadLength: UInt32
    
    public init(magic: UInt32 = FrameConstants.magic, version: UInt16 = FrameConstants.version, messageType: MessageType, payloadLength: UInt32) {
        self.magic = magic
        self.version = version
        self.messageType = messageType
        self.payloadLength = payloadLength
    }
}

public struct DecodedFrame: Sendable {
    public let header: FrameHeader
    public let payload: Data
}

public enum FramingError: Error, LocalizedError {
    case bufferTooShort
    case invalidMagic(UInt32)
    case invalidMessageType(UInt16)
    
    public var errorDescription: String? {
        switch self {
        case .bufferTooShort: return "Buffer shorter than header length (12 bytes)"
        case .invalidMagic(let val): return "Invalid magic bytes: \(String(format: "0x%08X", val))"
        case .invalidMessageType(let val): return "Unknown message type: \(val)"
        }
    }
}

public final class ProtocolFraming: @unchecked Sendable {
    public static func encode(type: MessageType, payload: Data) -> Data {
        var data = Data(capacity: FrameConstants.headerSize + payload.count)
        
        var magic = FrameConstants.magic.bigEndian
        var version = FrameConstants.version.bigEndian
        var msgType = type.rawValue.bigEndian
        var length = UInt32(payload.count).bigEndian
        
        withUnsafeBytes(of: &magic) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: &version) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: &msgType) { data.append(contentsOf: $0) }
        withUnsafeBytes(of: &length) { data.append(contentsOf: $0) }
        
        data.append(payload)
        return data
    }
    
    public static func encodeJSON<T: Encodable>(type: MessageType, object: T) throws -> Data {
        let payload = try JSONEncoder().encode(object)
        return encode(type: type, payload: payload)
    }
    
    public static func decodeHeader(data: Data) throws -> FrameHeader {
        guard data.count >= FrameConstants.headerSize else {
            throw FramingError.bufferTooShort
        }
        
        let magic = data.subdata(in: 0..<4).withUnsafeBytes { $0.load(as: UInt32.self).bigEndian }
        guard magic == FrameConstants.magic else {
            throw FramingError.invalidMagic(magic)
        }
        
        let version = data.subdata(in: 4..<6).withUnsafeBytes { $0.load(as: UInt16.self).bigEndian }
        let rawType = data.subdata(in: 6..<8).withUnsafeBytes { $0.load(as: UInt16.self).bigEndian }
        guard let messageType = MessageType(rawValue: rawType) else {
            throw FramingError.invalidMessageType(rawType)
        }
        
        let length = data.subdata(in: 8..<12).withUnsafeBytes { $0.load(as: UInt32.self).bigEndian }
        
        return FrameHeader(magic: magic, version: version, messageType: messageType, payloadLength: length)
    }
}

public final class StreamFrameAccumulator: @unchecked Sendable {
    private var buffer = Data()
    private let lock = NSLock()
    
    public init() {}
    
    public func append(_ data: Data) throws -> [DecodedFrame] {
        lock.lock()
        defer { lock.unlock() }
        
        buffer.append(data)
        var frames: [DecodedFrame] = []
        
        while buffer.count >= FrameConstants.headerSize {
            let header = try ProtocolFraming.decodeHeader(data: buffer)
            let totalExpected = FrameConstants.headerSize + Int(header.payloadLength)
            
            if buffer.count < totalExpected {
                break
            }
            
            let payload = buffer.subdata(in: FrameConstants.headerSize..<totalExpected)
            frames.append(DecodedFrame(header: header, payload: payload))
            buffer.removeSubrange(0..<totalExpected)
        }
        
        return frames
    }
    
    public func clear() {
        lock.lock()
        defer { lock.unlock() }
        buffer.removeAll()
    }
    
    public var pendingBytes: Int {
        lock.lock()
        defer { lock.unlock() }
        return buffer.count
    }
}
