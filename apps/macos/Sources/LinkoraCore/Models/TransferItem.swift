import Foundation

public enum TransferDirection: String, Codable, Sendable {
    case incoming
    case outgoing
}

public enum TransferState: String, Codable, Sendable {
    case pending
    case inProgress
    case paused
    case completed
    case failed
    case cancelled
}

public struct TransferItem: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let fileName: String
    public let fileSizeBytes: Int64
    public let mimeType: String
    public let direction: TransferDirection
    public var state: TransferState
    public var bytesTransferred: Int64
    public var totalChunks: Int
    public var currentChunkIndex: Int
    public var sha256Expected: String
    public var sha256Verified: Bool
    public var localFilePath: String?
    public var speedBytesPerSec: Double
    public var createdAt: Date
    public var completedAt: Date?
    public var errorMessage: String?
    
    public var progress: Double {
        guard fileSizeBytes > 0 else { return 0 }
        return min(1.0, Double(bytesTransferred) / Double(fileSizeBytes))
    }
    
    public var formattedSize: String {
        ByteCountFormatter.string(fromByteCount: fileSizeBytes, countStyle: .file)
    }
    
    public var formattedSpeed: String {
        guard state == .inProgress, speedBytesPerSec > 0 else { return "" }
        let speed = ByteCountFormatter.string(fromByteCount: Int64(speedBytesPerSec), countStyle: .file)
        return "\(speed)/s"
    }
    
    public init(
        id: String = UUID().uuidString,
        fileName: String,
        fileSizeBytes: Int64,
        mimeType: String = "application/octet-stream",
        direction: TransferDirection,
        state: TransferState = .pending,
        bytesTransferred: Int64 = 0,
        totalChunks: Int = 1,
        currentChunkIndex: Int = 0,
        sha256Expected: String = "",
        sha256Verified: Bool = false,
        localFilePath: String? = nil,
        speedBytesPerSec: Double = 0,
        createdAt: Date = Date(),
        completedAt: Date? = nil,
        errorMessage: String? = nil
    ) {
        self.id = id
        self.fileName = fileName
        self.fileSizeBytes = fileSizeBytes
        self.mimeType = mimeType
        self.direction = direction
        self.state = state
        self.bytesTransferred = bytesTransferred
        self.totalChunks = totalChunks
        self.currentChunkIndex = currentChunkIndex
        self.sha256Expected = sha256Expected
        self.sha256Verified = sha256Verified
        self.localFilePath = localFilePath
        self.speedBytesPerSec = speedBytesPerSec
        self.createdAt = createdAt
        self.completedAt = completedAt
        self.errorMessage = errorMessage
    }
}
