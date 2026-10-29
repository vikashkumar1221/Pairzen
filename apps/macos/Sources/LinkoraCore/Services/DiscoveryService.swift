import Foundation
import Network

public protocol DiscoveryServiceDelegate: AnyObject {
    func discoveryService(_ service: DiscoveryService, didDiscover device: DiscoveredDevice)
    func discoveryService(_ service: DiscoveryService, didLose deviceId: String)
}

public final class DiscoveryService: @unchecked Sendable {
    public weak var delegate: DiscoveryServiceDelegate?
    
    private var browser: NWBrowser?
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.linkora.discovery", qos: .userInitiated)
    
    public private(set) var isAdvertising = false
    public private(set) var isBrowsing = false
    public private(set) var discoveredDevices: [String: DiscoveredDevice] = [:]
    
    public init() {}
    
    public func startAdvertising(name: String, port: UInt16 = 8765) throws {
        guard !isAdvertising else { return }
        
        let parameters = NWParameters.tcp
        let nwPort = NWEndpoint.Port(rawValue: port) ?? NWEndpoint.Port(integerLiteral: 8765)
        
        listener = try NWListener(using: parameters, on: nwPort)
        listener?.service = NWListener.Service(name: name, type: "_linkora._tcp")
        
        listener?.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.isAdvertising = true
            case .failed(let err):
                self?.isAdvertising = false
                print("[DiscoveryService] Listener failed: \(err)")
            case .cancelled:
                self?.isAdvertising = false
            default:
                break
            }
        }
        
        listener?.start(queue: queue)
    }
    
    public func startBrowsing() {
        guard !isBrowsing else { return }
        
        let parameters = NWParameters()
        parameters.includePeerToPeer = true
        
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_linkora._tcp", domain: nil)
        browser = NWBrowser(for: descriptor, using: parameters)
        
        browser?.browseResultsChangedHandler = { [weak self] results, changes in
            guard let self = self else { return }
            
            for result in results {
                switch result.endpoint {
                case .service(let name, _, _, _):
                    let device = DiscoveredDevice(
                        id: name,
                        name: name,
                        host: "local",
                        port: 8765,
                        platform: name.lowercased().contains("iphone") ? .ios : .android
                    )
                    self.discoveredDevices[name] = device
                    self.delegate?.discoveryService(self, didDiscover: device)
                default:
                    break
                }
            }
        }
        
        browser?.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.isBrowsing = true
            case .failed(let err):
                self?.isBrowsing = false
                print("[DiscoveryService] Browser failed: \(err)")
            default:
                break
            }
        }
        
        browser?.start(queue: queue)
    }
    
    public func stop() {
        browser?.cancel()
        browser = nil
        isBrowsing = false
        
        listener?.cancel()
        listener = nil
        isAdvertising = false
        
        discoveredDevices.removeAll()
    }
}
