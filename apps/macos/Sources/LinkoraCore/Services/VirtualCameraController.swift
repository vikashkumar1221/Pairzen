import Foundation
import AppKit

public protocol VirtualCameraControllerDelegate: AnyObject {
    func virtualCamera(_ controller: VirtualCameraController, didReceiveImage image: NSImage)
}

public final class VirtualCameraController: @unchecked Sendable {
    public static let shared = VirtualCameraController()
    
    public weak var delegate: VirtualCameraControllerDelegate?
    public private(set) var latestImage: NSImage?
    public private(set) var isStreaming: Bool = false
    public private(set) var currentFps: Double = 0.0
    
    private var frameCount: Int = 0
    private var lastFpsTimestamp: Date = Date()
    private let lock = NSLock()
    
    public init() {}
    
    public func startStream() {
        lock.lock()
        isStreaming = true
        frameCount = 0
        lastFpsTimestamp = Date()
        lock.unlock()
    }
    
    public func stopStream() {
        lock.lock()
        isStreaming = false
        latestImage = nil
        lock.unlock()
    }
    
    public func ingestFrame(data: Data) {
        guard isStreaming else { return }
        
        if let image = NSImage(data: data) {
            lock.lock()
            latestImage = image
            frameCount += 1
            
            let now = Date()
            let elapsed = now.timeIntervalSince(lastFpsTimestamp)
            if elapsed >= 1.0 {
                currentFps = Double(frameCount) / elapsed
                frameCount = 0
                lastFpsTimestamp = now
            }
            lock.unlock()
            
            delegate?.virtualCamera(self, didReceiveImage: image)
        }
    }
    
    /**
     * Technical note on system-wide virtual camera support:
     * Starting in macOS 12.3+, Apple introduced `CoreMediaIO` System Extensions (`CMIOExtensionProvider`).
     * To register as a system-wide webcam visible in Zoom/FaceTime/Meet, a separate driver bundle
     * with the `com.apple.developer.coremediaio.camera-provider` entitlement and Developer ID signing
     * is required. Linkora delivers in-app high-res preview and provides the CMIOExtension scaffold in `drivers/cmio-extension`.
     */
    public var isSystemWideDriverInstalled: Bool {
        // Safe check for the Linkora CMIOExtension plugin in Library/CoreMediaIO/Plug-Ins/DAL
        let pluginPath = "/Library/CoreMediaIO/Plug-Ins/DAL/LinkoraCamera.plugin"
        return FileManager.default.fileExists(atPath: pluginPath)
    }
}
