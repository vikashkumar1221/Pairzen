import Foundation

public struct ClipboardItem: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let content: String
    public let mimeType: String
    public let timestamp: Date
    public let sha256: String
    public let sourceDeviceId: String
    public let sourceDeviceName: String
    
    public init(
        id: String = UUID().uuidString,
        content: String,
        mimeType: String = "text/plain",
        timestamp: Date = Date(),
        sha256: String,
        sourceDeviceId: String,
        sourceDeviceName: String
    ) {
        self.id = id
        self.content = content
        self.mimeType = mimeType
        self.timestamp = timestamp
        self.sha256 = sha256
        self.sourceDeviceId = sourceDeviceId
        self.sourceDeviceName = sourceDeviceName
    }
}
