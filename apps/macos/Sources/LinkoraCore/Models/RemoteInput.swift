import Foundation

public enum RemoteInputType: String, Codable, Sendable {
    case mouseMove = "mouse_move"
    case mouseClick = "mouse_click"
    case mouseScroll = "mouse_scroll"
    case keyPress = "key_press"
    case mediaControl = "media_control"
}

public struct RemoteInputEvent: Codable, Sendable {
    public let type: RemoteInputType
    public var dx: Double?
    public var dy: Double?
    public var button: String? // "left", "right", "middle"
    public var clickType: String? // "down", "up", "click", "double"
    public var scrollDx: Double?
    public var scrollDy: Double?
    public var key: String?
    public var mediaAction: String? // "play_pause", "next", "prev", "volume_up", "volume_down"
    
    public init(
        type: RemoteInputType,
        dx: Double? = nil,
        dy: Double? = nil,
        button: String? = nil,
        clickType: String? = nil,
        scrollDx: Double? = nil,
        scrollDy: Double? = nil,
        key: String? = nil,
        mediaAction: String? = nil
    ) {
        self.type = type
        self.dx = dx
        self.dy = dy
        self.button = button
        self.clickType = clickType
        self.scrollDx = scrollDx
        self.scrollDy = scrollDy
        self.key = key
        self.mediaAction = mediaAction
    }
}
