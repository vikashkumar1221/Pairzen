import Foundation
import CryptoKit

public protocol FileTransferEngineDelegate: AnyObject {
    func transferEngine(_ engine: FileTransferEngine, didUpdateItem item: TransferItem)
    func transferEngine(_ engine: FileTransferEngine, didCompleteItem item: TransferItem)
    func transferEngine(_ engine: FileTransferEngine, didFailItem item: TransferItem, error: Error)
}

public final class FileTransferEngine: @unchecked Sendable {
    public static let chunkSize = 64 * 1024 // 64 KB
    
    public weak var delegate: FileTransferEngineDelegate?
    public private(set) var activeTransfers: [String: TransferItem] = [:]
    
    private let queue = DispatchQueue(label: "com.linkora.filetransfer", qos: .utility)
    private let downloadsDirectory: URL
    
    public init() {
        let paths = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)
        self.downloadsDirectory = paths.first ?? URL(fileURLWithPath: NSTemporaryDirectory())
    }
    
    public func createOutgoingTransfer(fileURL: URL) throws -> TransferItem {
        let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
        let fileSize = (attributes[.size] as? NSNumber)?.int64Value ?? 0
        let totalChunks = Int(ceil(Double(fileSize) / Double(Self.chunkSize)))
        
        // Compute SHA-256 hash using streaming FileHandle
        var sha256Hasher = SHA256()
        let handle = try FileHandle(forReadingFrom: fileURL)
        defer { try? handle.close() }
        
        while true {
            let chunk = handle.readData(ofLength: Self.chunkSize)
            if chunk.isEmpty { break }
            sha256Hasher.update(data: chunk)
        }
        let hashDigest = sha256Hasher.finalize().map { String(format: "%02x", $0) }.joined()
        
        let item = TransferItem(
            fileName: fileURL.lastPathComponent,
            fileSizeBytes: fileSize,
            direction: .outgoing,
            state: .pending,
            totalChunks: max(1, totalChunks),
            sha256Expected: hashDigest,
            localFilePath: fileURL.path
        )
        
        activeTransfers[item.id] = item
        delegate?.transferEngine(self, didUpdateItem: item)
        return item
    }
    
    public func readChunk(item: TransferItem, chunkIndex: Int) throws -> Data {
        guard let path = item.localFilePath else {
            throw NSError(domain: "FileTransferEngine", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing local file path"])
        }
        let handle = try FileHandle(forReadingFrom: URL(fileURLWithPath: path))
        defer { try? handle.close() }
        
        let offset = UInt64(chunkIndex * Self.chunkSize)
        try handle.seek(toOffset: offset)
        return handle.readData(ofLength: Self.chunkSize)
    }
    
    public func prepareIncomingTransfer(
        transferId: String,
        fileName: String,
        fileSizeBytes: Int64,
        sha256: String,
        totalChunks: Int
    ) throws -> TransferItem {
        let safeName = resolveUniqueFileName(baseName: fileName)
        let destinationURL = downloadsDirectory.appendingPathComponent(safeName)
        
        // Create empty destination file
        FileManager.default.createFile(atPath: destinationURL.path, contents: nil)
        
        let item = TransferItem(
            id: transferId,
            fileName: safeName,
            fileSizeBytes: fileSizeBytes,
            direction: .incoming,
            state: .inProgress,
            totalChunks: totalChunks,
            sha256Expected: sha256,
            localFilePath: destinationURL.path
        )
        
        activeTransfers[transferId] = item
        delegate?.transferEngine(self, didUpdateItem: item)
        return item
    }
    
    public func writeChunk(transferId: String, chunkIndex: Int, chunkData: Data) throws {
        guard var item = activeTransfers[transferId], let path = item.localFilePath else {
            throw NSError(domain: "FileTransferEngine", code: 2, userInfo: [NSLocalizedDescriptionKey: "Active transfer not found"])
        }
        
        let handle = try FileHandle(forWritingTo: URL(fileURLWithPath: path))
        defer { try? handle.close() }
        
        let offset = UInt64(chunkIndex * Self.chunkSize)
        try handle.seek(toOffset: offset)
        handle.write(chunkData)
        
        item.currentChunkIndex = chunkIndex + 1
        item.bytesTransferred += Int64(chunkData.count)
        
        if item.currentChunkIndex >= item.totalChunks {
            // Verify final SHA-256
            let isVerified = verifyFileHash(path: path, expectedSha256: item.sha256Expected)
            item.sha256Verified = isVerified
            item.state = isVerified ? .completed : .failed
            item.completedAt = Date()
            if !isVerified {
                item.errorMessage = "SHA-256 hash mismatch: file may be corrupted"
            }
            activeTransfers[transferId] = item
            delegate?.transferEngine(self, didCompleteItem: item)
        } else {
            activeTransfers[transferId] = item
            delegate?.transferEngine(self, didUpdateItem: item)
        }
    }
    
    private func verifyFileHash(path: String, expectedSha256: String) -> Bool {
        guard let handle = try? FileHandle(forReadingFrom: URL(fileURLWithPath: path)) else { return false }
        defer { try? handle.close() }
        
        var hasher = SHA256()
        while true {
            let chunk = handle.readData(ofLength: Self.chunkSize)
            if chunk.isEmpty { break }
            hasher.update(data: chunk)
        }
        let calculated = hasher.finalize().map { String(format: "%02x", $0) }.joined()
        return calculated.lowercased() == expectedSha256.lowercased()
    }
    
    private func resolveUniqueFileName(baseName: String) -> String {
        var destination = downloadsDirectory.appendingPathComponent(baseName)
        if !FileManager.default.fileExists(atPath: destination.path) {
            return baseName
        }
        
        let fileExtension = (baseName as NSString).pathExtension
        let nameWithoutExtension = (baseName as NSString).deletingPathExtension
        var counter = 1
        
        while FileManager.default.fileExists(atPath: destination.path) {
            let candidate = fileExtension.isEmpty
                ? "\(nameWithoutExtension) (\(counter))"
                : "\(nameWithoutExtension) (\(counter)).\(fileExtension)"
            destination = downloadsDirectory.appendingPathComponent(candidate)
            counter += 1
        }
        
        return destination.lastPathComponent
    }
}
