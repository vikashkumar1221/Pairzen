import Foundation
import AppKit

public protocol ClipboardSyncEngineDelegate: AnyObject {
    func clipboardEngine(_ engine: ClipboardSyncEngine, didDetectNewContent item: ClipboardItem)
}

public final class ClipboardSyncEngine: @unchecked Sendable {
    public weak var delegate: ClipboardSyncEngineDelegate?
    
    public var isEnabled: Bool = false {
        didSet {
            if isEnabled {
                startMonitoring()
            } else {
                stopMonitoring()
            }
        }
    }
    
    private var lastChangeCount: Int = 0
    private var timer: Timer?
    private var seenHashes: Set<String> = []
    private let lock = NSLock()
    
    public init() {
        self.lastChangeCount = NSPasteboard.general.changeCount
    }
    
    public func startMonitoring() {
        guard timer == nil else { return }
        
        timer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: true) { [weak self] _ in
            self?.checkForChanges()
        }
    }
    
    public func stopMonitoring() {
        timer?.invalidate()
        timer = nil
    }
    
    private func checkForChanges() {
        let currentCount = NSPasteboard.general.changeCount
        guard currentCount != lastChangeCount else { return }
        lastChangeCount = currentCount
        
        guard let text = NSPasteboard.general.string(forType: .string), !text.isEmpty else {
            return
        }
        
        let hash = CryptoEngine.sha256Hex(Data(text.utf8))
        
        lock.lock()
        if seenHashes.contains(hash) {
            lock.unlock()
            return
        }
        seenHashes.insert(hash)
        lock.unlock()
        
        let item = ClipboardItem(
            content: text,
            mimeType: "text/plain",
            sha256: hash,
            sourceDeviceId: "local-mac",
            sourceDeviceName: Host.current().localizedName ?? "MacBook"
        )
        
        delegate?.clipboardEngine(self, didDetectNewContent: item)
    }
    
    public func applyRemoteClipboard(item: ClipboardItem) {
        lock.lock()
        seenHashes.insert(item.sha256)
        lock.unlock()
        
        DispatchQueue.main.async {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(item.content, forType: .string)
            self.lastChangeCount = NSPasteboard.general.changeCount
        }
    }
}
