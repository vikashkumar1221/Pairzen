import Foundation
import CoreGraphics
import ApplicationServices

public final class RemoteInputController: @unchecked Sendable {
    public static let shared = RemoteInputController()
    
    public init() {}
    
    public var isAccessibilityGranted: Bool {
        let promptKey = "AXTrustedCheckOptionPrompt" as CFString
        let options = [promptKey: false] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }
    
    public func promptForAccessibilityPermission() {
        let promptKey = "AXTrustedCheckOptionPrompt" as CFString
        let options = [promptKey: true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
    }
    
    public func handleRemoteInput(_ event: RemoteInputEvent) {
        guard isAccessibilityGranted else {
            print("[RemoteInput] Accessibility permission not granted. Cannot inject input events.")
            return
        }
        
        switch event.type {
        case .mouseMove:
            handleMouseMove(dx: event.dx ?? 0, dy: event.dy ?? 0)
        case .mouseClick:
            handleMouseClick(button: event.button ?? "left", clickType: event.clickType ?? "click")
        case .mouseScroll:
            handleMouseScroll(dx: event.scrollDx ?? 0, dy: event.scrollDy ?? 0)
        case .keyPress:
            if let key = event.key {
                handleKeyPress(key: key)
            }
        case .mediaControl:
            // Media key actions handled via system events
            break
        }
    }
    
    private func handleMouseMove(dx: Double, dy: Double) {
        let currentPos = CGEvent(source: nil)?.location ?? CGPoint.zero
        let newX = max(0, currentPos.x + CGFloat(dx))
        let newY = max(0, currentPos.y + CGFloat(dy))
        let target = CGPoint(x: newX, y: newY)
        
        if let moveEvent = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: target, mouseButton: .left) {
            moveEvent.post(tap: .cghidEventTap)
        }
    }
    
    private func handleMouseClick(button: String, clickType: String) {
        let pos = CGEvent(source: nil)?.location ?? CGPoint.zero
        let isRight = button == "right"
        
        let downType: CGEventType = isRight ? .rightMouseDown : .leftMouseDown
        let upType: CGEventType = isRight ? .rightMouseUp : .leftMouseUp
        let btn: CGMouseButton = isRight ? .right : .left
        
        if let down = CGEvent(mouseEventSource: nil, mouseType: downType, mouseCursorPosition: pos, mouseButton: btn) {
            down.post(tap: .cghidEventTap)
        }
        
        usleep(10_000) // 10ms click duration
        
        if let up = CGEvent(mouseEventSource: nil, mouseType: upType, mouseCursorPosition: pos, mouseButton: btn) {
            up.post(tap: .cghidEventTap)
        }
    }
    
    private func handleMouseScroll(dx: Double, dy: Double) {
        if let scrollEvent = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 2, wheel1: Int32(dy), wheel2: Int32(dx), wheel3: 0) {
            scrollEvent.post(tap: .cghidEventTap)
        }
    }
    
    private func handleKeyPress(key: String) {
        // Safe key injection for characters
        guard let char = key.utf16.first else { return }
        var unichar = char
        
        if let keyDown = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true) {
            keyDown.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unichar)
            keyDown.post(tap: .cghidEventTap)
        }
        
        if let keyUp = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) {
            keyUp.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unichar)
            keyUp.post(tap: .cghidEventTap)
        }
    }
}
