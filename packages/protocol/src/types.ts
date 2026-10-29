/**
 * Linkora Protocol Types and Wire Message Definitions
 * Strict specification for cross-platform interop across macOS, Android, iOS, and Web.
 */

export const PROTOCOL_MAGIC = 0x4c4e4b52; // "LNKR"
export const PROTOCOL_VERSION = 1;
export const DEFAULT_TCP_PORT = 8765;
export const MDNS_SERVICE_TYPE = "_linkora._tcp";
export const CHUNK_SIZE_BYTES = 64 * 1024; // 64 KB

export enum Platform {
  MACOS = "macos",
  ANDROID = "android",
  IOS = "ios",
  WEB = "web"
}

export enum MessageType {
  // Handshake & Pairing
  HANDSHAKE_INIT = 0x0001,
  HANDSHAKE_ACK = 0x0002,
  HANDSHAKE_CONFIRM = 0x0003,

  // Heartbeat & Telemetry
  PING = 0x0010,
  PONG = 0x0011,
  DEVICE_STATUS = 0x0020,

  // Clipboard
  CLIPBOARD_SYNC = 0x0030,

  // File Transfer
  FILE_TRANSFER_REQUEST = 0x0040,
  FILE_TRANSFER_ACCEPT = 0x0041,
  FILE_TRANSFER_REJECT = 0x0042,
  FILE_TRANSFER_CHUNK = 0x0043,
  FILE_TRANSFER_COMPLETE = 0x0044,
  FILE_TRANSFER_CANCEL = 0x0045,

  // Camera & Webcam
  CAMERA_STREAM_START = 0x0050,
  CAMERA_STREAM_STOP = 0x0051,
  CAMERA_FRAME = 0x0052,

  // Remote Input
  REMOTE_INPUT_EVENT = 0x0060,

  // Phone Biometric Approval
  AUTH_CHALLENGE_REQUEST = 0x0070,
  AUTH_CHALLENGE_RESPONSE = 0x0071,

  // Notifications
  NOTIFICATION_EVENT = 0x0080,

  // Error
  ERROR_RESPONSE = 0x00ff
}

export interface DeviceCapabilities {
  fileSharing: boolean;
  clipboardSync: boolean;
  cameraStream: boolean;
  remoteInputReceiver: boolean;
  remoteInputSender: boolean;
  biometricApproval: boolean;
  notificationMirroring: boolean;
}

export interface DeviceMetadata {
  id: string;
  name: string;
  platform: Platform;
  model: string;
  osVersion: string;
  appVersion: string;
  capabilities: DeviceCapabilities;
}

export interface BatteryStatus {
  level: number; // 0.0 to 1.0
  isCharging: boolean;
  isLowPowerMode?: boolean;
}

// Handshake Messages
export interface HandshakeInitPayload {
  protocolVersion: number;
  sender: DeviceMetadata;
  ephemeralPublicKeyHex: string; // P-256 in uncompressed hex
  nonceHex: string; // 32 random bytes hex
  timestamp: number;
}

export interface HandshakeAckPayload {
  protocolVersion: number;
  responder: DeviceMetadata;
  ephemeralPublicKeyHex: string;
  nonceHex: string;
  sasCode: string; // 6-digit confirmation code
  signatureHex: string; // Responder signed (senderNonce + responderNonce)
  timestamp: number;
}

export interface HandshakeConfirmPayload {
  accepted: boolean;
  signatureHex: string; // Sender signed (responderNonce + senderNonce)
  sessionTokenHex: string; // Encrypted initial auth token
}

// Telemetry & Status
export interface DeviceStatusPayload {
  battery?: BatteryStatus;
  wifiSsid?: string;
  signalStrengthDbm?: number;
  uptimeSeconds: number;
  capabilities: DeviceCapabilities;
}

// Clipboard Payload
export interface ClipboardPayload {
  id: string;
  timestamp: number;
  mimeType: "text/plain" | "text/uri-list" | "image/png";
  content: string; // UTF-8 text or base64
  checksumSha256: string;
  sourceDeviceId: string;
}

// File Transfer Messages
export interface FileTransferRequestPayload {
  transferId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  totalChunks: number;
  chunkSizeBytes: number;
  previewBase64?: string;
}

export interface FileTransferAcceptPayload {
  transferId: string;
  accepted: boolean;
  reason?: string;
  startChunkIndex: number; // For resuming interrupted transfers
}

export interface FileTransferChunkHeader {
  transferId: string;
  chunkIndex: number;
  chunkLength: number;
  chunkSha256: string;
}

export interface FileTransferCompletePayload {
  transferId: string;
  success: boolean;
  sha256Verified: boolean;
  elapsedMs: number;
  savedPath?: string;
}

// Camera Messages
export interface CameraStreamStartPayload {
  cameraPosition: "back" | "front";
  targetWidth: number;
  targetHeight: number;
  targetFps: number;
  torchEnabled: boolean;
}

export interface CameraFrameHeader {
  sequenceNumber: number;
  timestampMs: number;
  format: "jpeg" | "h264";
  width: number;
  height: number;
}

// Remote Input Messages
export type RemoteInputType =
  | "mouse_move"
  | "mouse_click"
  | "mouse_scroll"
  | "key_press"
  | "media_control";

export interface RemoteInputPayload {
  type: RemoteInputType;
  // Mouse coordinates (normalized delta -1.0 to 1.0 or absolute)
  dx?: number;
  dy?: number;
  button?: "left" | "right" | "middle";
  clickType?: "down" | "up" | "click" | "double";
  scrollDx?: number;
  scrollDy?: number;
  // Key press
  key?: string;
  modifiers?: {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean; // Cmd on Mac
  };
  // Media controls
  mediaAction?: "play_pause" | "next" | "prev" | "volume_up" | "volume_down" | "mute";
}

// Phone Biometric Approval
export interface AuthChallengeRequestPayload {
  challengeId: string;
  action: "mac_screen_unlock" | "privileged_action" | "file_access";
  targetDeviceName: string;
  nonceHex: string;
  expiresAt: number;
  metadata?: Record<string, string>;
}

export interface AuthChallengeResponsePayload {
  challengeId: string;
  approved: boolean;
  biometricType: "face_id" | "touch_id" | "android_biometric" | "passcode";
  signatureHex: string; // Signed challengeId + nonceHex using Secure Enclave / Keystore key
  timestamp: number;
  errorCode?: string;
}

// Notifications
export interface NotificationPayload {
  notificationId: string;
  appPackage: string;
  appName: string;
  appIconBase64?: string;
  title: string;
  body: string;
  postTime: number;
  category?: string;
  actions?: Array<{
    id: string;
    title: string;
  }>;
}

// Generic Error
export interface ErrorResponsePayload {
  code: string;
  message: string;
  details?: unknown;
}
