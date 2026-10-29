import SwiftUI
import UniformTypeIdentifiers
import LinkoraCore

struct FileSharingView: View {
    @EnvironmentObject var appState: LinkoraAppState
    @State private var isTargetedForDrop = false
    @State private var isFileImporterPresented = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Universal File Sharing")
                        .font(.title2.bold())
                    Text("Transfer photos, 4K videos, documents, and archives without size limits or cloud uploads.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Drag & Drop Area
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            isTargetedForDrop ? Color.accentColor : Color.secondary.opacity(0.25),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(isTargetedForDrop ? Color.accentColor.opacity(0.06) : Color(nsColor: .controlBackgroundColor))
                        )
                    
                    VStack(spacing: 12) {
                        Image(systemName: "arrow.up.doc.fill")
                            .font(.system(size: 38))
                            .foregroundColor(.accentColor)
                        
                        VStack(spacing: 4) {
                            Text("Drag files here or browse to send to connected phone")
                                .font(.headline)
                            Text("Fast peer-to-peer 64KB chunk streaming over local Wi-Fi")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Button("Select Files…") {
                            isFileImporterPresented = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(32)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 180)
                .onDrop(of: [.item], isTargeted: $isTargetedForDrop) { providers in
                    handleDroppedProviders(providers)
                    return true
                }
                .fileImporter(
                    isPresented: $isFileImporterPresented,
                    allowedContentTypes: [.item],
                    allowsMultipleSelection: true
                ) { result in
                    if case .success(let urls) = result {
                        for url in urls {
                            startSendingFile(url: url)
                        }
                    }
                }
                
                // Transfer Queue & History
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Transfers & Queue")
                            .font(.headline)
                        Spacer()
                        if !appState.transfers.isEmpty {
                            Button("Clear Finished") {
                                appState.transfers.removeAll { $0.state == .completed || $0.state == .cancelled }
                            }
                            .font(.caption)
                        }
                    }
                    
                    if appState.transfers.isEmpty {
                        Text("No active or recent transfers.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 20)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(appState.transfers) { item in
                                TransferItemRow(item: item)
                            }
                        }
                    }
                }
            }
            .padding(24)
        }
    }
    
    private func handleDroppedProviders(_ providers: [NSItemProvider]) {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.item.identifier, options: nil) { item, _ in
                if let url = item as? URL {
                    DispatchQueue.main.async {
                        self.startSendingFile(url: url)
                    }
                }
            }
        }
    }
    
    private func startSendingFile(url: URL) {
        do {
            let item = try appState.fileEngine.createOutgoingTransfer(fileURL: url)
            appState.addTransfer(item)
        } catch {
            print("[FileSharingView] Failed to create outgoing transfer: \(error)")
        }
    }
}

struct TransferItemRow: View {
    let item: TransferItem
    
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: item.direction == .incoming ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(item.direction == .incoming ? .blue : .green)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.fileName)
                        .font(.system(size: 14, weight: .semibold))
                    HStack(spacing: 6) {
                        Text(item.formattedSize)
                        Text("•")
                        Text(item.direction == .incoming ? "Incoming" : "Outgoing")
                        if item.state == .inProgress {
                            Text("•")
                            Text(item.formattedSpeed)
                        }
                        if item.sha256Verified {
                            Text("•")
                            Label("SHA-256 Verified", systemImage: "checkmark.seal.fill")
                                .foregroundColor(.green)
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                TransferStatusBadge(state: item.state)
            }
            
            if item.state == .inProgress {
                ProgressView(value: item.progress)
                    .progressViewStyle(.linear)
            }
        }
        .padding(14)
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.secondary.opacity(0.12), lineWidth: 1)
        )
    }
}

struct TransferStatusBadge: View {
    let state: TransferState
    
    var body: some View {
        HStack(spacing: 4) {
            switch state {
            case .pending:
                Text("Pending").foregroundColor(.orange)
            case .inProgress:
                Text("Transferring…").foregroundColor(.blue)
            case .completed:
                Image(systemName: "checkmark")
                Text("Done")
            case .paused:
                Text("Paused").foregroundColor(.secondary)
            case .failed:
                Image(systemName: "exclamationmark.triangle")
                Text("Failed").foregroundColor(.red)
            case .cancelled:
                Text("Cancelled").foregroundColor(.secondary)
            }
        }
        .font(.caption2.bold())
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.secondary.opacity(0.08))
        .cornerRadius(6)
    }
}
