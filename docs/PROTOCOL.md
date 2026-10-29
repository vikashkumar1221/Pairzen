# Linkora Local Communication Protocol Specification

**Version:** 1.0.0  
**Transport:** Raw TCP Sockets over Local Wi-Fi (Default) / WebSocket (Cloud Relay Fallback)  
**Default Port:** 8765  
**mDNS Service Type:** `_linkora._tcp`  

---

## 1. Binary Packet Framing

Every packet transmitted between Linkora peers begins with a 12-byte big-endian header followed by the message payload:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Magic (0x4C4E4B52)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Version (1)          |      Message Type (Enum)      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Payload Length (Bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                     Payload (Variable Length)                 +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Field Definitions:
- **Magic (4 bytes)**: `0x4C4E4B52` (ASCII `"LNKR"`). Drops unrecognized packets.
- **Version (2 bytes)**: Protocol version integer (currently `1`).
- **Message Type (2 bytes)**: Identifies the control payload or stream block.
- **Payload Length (4 bytes)**: Unsigned 32-bit big-endian length of the upcoming payload buffer.

---

## 2. Message Types

| Value | Identifier | Description |
| :--- | :--- | :--- |
| `0x0001` | `HANDSHAKE_INIT` | Ephemeral ECDH P-256 public key + peer metadata + 32-byte nonce |
| `0x0002` | `HANDSHAKE_ACK` | Responder ECDH public key + SAS PIN + nonce signature |
| `0x0003` | `HANDSHAKE_CONFIRM` | Peer verification confirmation + encrypted session token |
| `0x0010` | `PING` | Heartbeat keep-alive and latency measurement |
| `0x0011` | `PONG` | Heartbeat response with echo timestamp |
| `0x0020` | `DEVICE_STATUS` | Battery percentage, charging status, Wi-Fi RSSI |
| `0x0030` | `CLIPBOARD_SYNC` | Deduplicated text/link clipboard item with SHA-256 |
| `0x0040` | `FILE_TRANSFER_REQUEST` | Transfer ID, filename, total size, chunk count, SHA-256 hash |
| `0x0041` | `FILE_TRANSFER_ACCEPT` | Transfer acceptance with starting chunk offset (resume support) |
| `0x0042` | `FILE_TRANSFER_REJECT` | Transfer rejection reason code |
| `0x0043` | `FILE_TRANSFER_CHUNK` | 64KB binary chunk + chunk index + rolling SHA-256 |
| `0x0044` | `FILE_TRANSFER_COMPLETE`| Final transfer verification confirmation |
| `0x0045` | `FILE_TRANSFER_CANCEL` | User cancellation of in-flight transfer |
| `0x0050` | `CAMERA_STREAM_START` | Target FPS, resolution (1080p), lens position (front/back) |
| `0x0051` | `CAMERA_STREAM_STOP` | Stops active camera frame streaming |
| `0x0052` | `CAMERA_FRAME` | Compressed JPEG / H.264 video frame |
| `0x0060` | `REMOTE_INPUT_EVENT` | Mouse cursor delta, click, scroll wheel, key press |
| `0x0070` | `AUTH_CHALLENGE_REQUEST`| Nonce challenge for phone biometric approval |
| `0x0071` | `AUTH_CHALLENGE_RESPONSE`| Nonce signature signed by phone Secure Enclave / Keystore |
| `0x0080` | `NOTIFICATION_EVENT` | Android mirrored notification (title, body, icon) |
| `0x00FF` | `ERROR_RESPONSE` | Error code and debug message |

---

## 3. Cryptographic Handshake & SAS Verification

1. **Ephemeral Key Agreement (ECDH P-256)**:
   - Initiator generates ephemeral keypair \((SK_A, PK_A)\) and 32-byte nonce \(N_A\).
   - Initiator sends `HANDSHAKE_INIT`.
   - Responder generates ephemeral keypair \((SK_B, PK_B)\) and 32-byte nonce \(N_B\).
   - Both parties compute the shared secret \(SS = ECDH(SK, PK_{peer})\).
   - Session keys are derived via HKDF-SHA256:
     $$\text{Key}_{AES} = \text{HKDF}(SS, \text{salt}="LinkoraKeyExchangeSalt", \text{info}="LinkoraSessionKey", L=32)$$

2. **Short Authentication String (SAS)**:
   - Both devices derive a visual 6-digit PIN code:
     $$\text{SAS} = \text{SHA256}(N_A \mathbin{\Vert} N_B \mathbin{\Vert} SS)[0..3] \pmod{1000000}$$
   - The user visually confirms the 6-digit number matches on both screens to eliminate Man-in-the-Middle (MitM) attacks.

---

## 4. Streaming File Transfer Engine

- **Chunk Size**: Constant 64KB (`65,536 bytes`).
- **Memory Optimization**: Handled using streaming `FileHandle` / file descriptors. Multi-gigabyte files never buffer in RAM.
- **Integrity**: Full SHA-256 digest computed during chunk generation and verified on disk destination upon arrival.
- **Resume**: If a connection drops at chunk index $K$, the recipient replies to `FILE_TRANSFER_REQUEST` with `startChunkIndex = K`, skipping already written bytes.
