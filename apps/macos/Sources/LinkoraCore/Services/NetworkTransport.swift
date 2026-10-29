import Foundation
import Network

public protocol NetworkTransportDelegate: AnyObject {
    func transport(_ transport: NetworkTransport, didReceiveFrame frame: DecodedFrame)
    func transport(_ transport: NetworkTransport, didChangeState state: ConnectionState)
    func transport(_ transport: NetworkTransport, didEncounterError error: Error)
}

public final class NetworkTransport: @unchecked Sendable {
    public weak var delegate: NetworkTransportDelegate?
    
    private var connection: NWConnection?
    private let accumulator = StreamFrameAccumulator()
    private let queue = DispatchQueue(label: "com.linkora.transport", qos: .userInitiated)
    
    public private(set) var currentState: ConnectionState = .disconnected
    
    public init() {}
    
    public func connect(host: String, port: UInt16) {
        let nwEndpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: port) ?? NWEndpoint.Port(integerLiteral: 8765)
        )
        let parameters = NWParameters.tcp
        
        let conn = NWConnection(to: nwEndpoint, using: parameters)
        self.connection = conn
        self.currentState = .connecting
        self.delegate?.transport(self, didChangeState: .connecting)
        
        conn.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            switch state {
            case .ready:
                self.currentState = .connected
                self.delegate?.transport(self, didChangeState: .connected)
                self.startReceiving()
            case .failed(let err):
                self.currentState = .disconnected
                self.delegate?.transport(self, didChangeState: .disconnected)
                self.delegate?.transport(self, didEncounterError: err)
            case .cancelled:
                self.currentState = .disconnected
                self.delegate?.transport(self, didChangeState: .disconnected)
            default:
                break
            }
        }
        
        conn.start(queue: queue)
    }
    
    public func send(type: MessageType, payload: Data) {
        guard let connection = connection, currentState == .connected else { return }
        let wireData = ProtocolFraming.encode(type: type, payload: payload)
        
        connection.send(content: wireData, completion: .contentProcessed { [weak self] error in
            if let error = error, let self = self {
                self.delegate?.transport(self, didEncounterError: error)
            }
        })
    }
    
    public func sendJSON<T: Encodable>(type: MessageType, object: T) throws {
        let payload = try JSONEncoder().encode(object)
        send(type: type, payload: payload)
    }
    
    private func startReceiving() {
        guard let connection = connection else { return }
        
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }
            
            if let data = data, !data.isEmpty {
                do {
                    let frames = try self.accumulator.append(data)
                    for frame in frames {
                        self.delegate?.transport(self, didReceiveFrame: frame)
                    }
                } catch {
                    self.delegate?.transport(self, didEncounterError: error)
                }
            }
            
            if isComplete {
                self.disconnect()
            } else if error == nil {
                self.startReceiving()
            } else if let error = error {
                self.delegate?.transport(self, didEncounterError: error)
            }
        }
    }
    
    public func disconnect() {
        connection?.cancel()
        connection = nil
        accumulator.clear()
        currentState = .disconnected
        delegate?.transport(self, didChangeState: .disconnected)
    }
}
