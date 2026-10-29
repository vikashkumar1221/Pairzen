import {
  MessageType,
  HandshakeInitPayload,
  HandshakeAckPayload,
  HandshakeConfirmPayload,
  DeviceStatusPayload,
  ClipboardPayload,
  FileTransferRequestPayload,
  FileTransferAcceptPayload,
  FileTransferCompletePayload,
  CameraStreamStartPayload,
  RemoteInputPayload,
  AuthChallengeRequestPayload,
  AuthChallengeResponsePayload,
  NotificationPayload,
  ErrorResponsePayload
} from "./types.js";
import { encodeJsonFrame, DecodedFrame } from "./framing.js";

export function createHandshakeInit(payload: HandshakeInitPayload): Uint8Array {
  return encodeJsonFrame(MessageType.HANDSHAKE_INIT, payload);
}

export function createHandshakeAck(payload: HandshakeAckPayload): Uint8Array {
  return encodeJsonFrame(MessageType.HANDSHAKE_ACK, payload);
}

export function createHandshakeConfirm(payload: HandshakeConfirmPayload): Uint8Array {
  return encodeJsonFrame(MessageType.HANDSHAKE_CONFIRM, payload);
}

export function createDeviceStatus(payload: DeviceStatusPayload): Uint8Array {
  return encodeJsonFrame(MessageType.DEVICE_STATUS, payload);
}

export function createClipboardSync(payload: ClipboardPayload): Uint8Array {
  return encodeJsonFrame(MessageType.CLIPBOARD_SYNC, payload);
}

export function createFileTransferRequest(payload: FileTransferRequestPayload): Uint8Array {
  return encodeJsonFrame(MessageType.FILE_TRANSFER_REQUEST, payload);
}

export function createFileTransferAccept(payload: FileTransferAcceptPayload): Uint8Array {
  return encodeJsonFrame(MessageType.FILE_TRANSFER_ACCEPT, payload);
}

export function createFileTransferComplete(payload: FileTransferCompletePayload): Uint8Array {
  return encodeJsonFrame(MessageType.FILE_TRANSFER_COMPLETE, payload);
}

export function createCameraStreamStart(payload: CameraStreamStartPayload): Uint8Array {
  return encodeJsonFrame(MessageType.CAMERA_STREAM_START, payload);
}

export function createRemoteInput(payload: RemoteInputPayload): Uint8Array {
  return encodeJsonFrame(MessageType.REMOTE_INPUT_EVENT, payload);
}

export function createAuthChallengeRequest(payload: AuthChallengeRequestPayload): Uint8Array {
  return encodeJsonFrame(MessageType.AUTH_CHALLENGE_REQUEST, payload);
}

export function createAuthChallengeResponse(payload: AuthChallengeResponsePayload): Uint8Array {
  return encodeJsonFrame(MessageType.AUTH_CHALLENGE_RESPONSE, payload);
}

export function createNotificationEvent(payload: NotificationPayload): Uint8Array {
  return encodeJsonFrame(MessageType.NOTIFICATION_EVENT, payload);
}

export function createErrorResponse(payload: ErrorResponsePayload): Uint8Array {
  return encodeJsonFrame(MessageType.ERROR_RESPONSE, payload);
}

/**
 * Parses JSON payload from a decoded frame.
 */
export function parseJsonPayload<T>(frame: DecodedFrame): T {
  const text = new TextDecoder().decode(frame.payload);
  return JSON.parse(text) as T;
}
