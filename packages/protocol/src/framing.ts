import { PROTOCOL_MAGIC, PROTOCOL_VERSION, MessageType } from "./types.js";

export const HEADER_SIZE = 12; // 4 + 2 + 2 + 4

export interface FrameHeader {
  magic: number;
  version: number;
  messageType: MessageType;
  payloadLength: number;
}

export interface DecodedFrame {
  header: FrameHeader;
  payload: Uint8Array;
}

/**
 * Encodes a message type and payload buffer into a wire-formatted Linkora frame.
 */
export function encodeFrame(messageType: MessageType, payload: Uint8Array): Uint8Array {
  const totalLength = HEADER_SIZE + payload.length;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Magic 0x4C4E4B52
  view.setUint32(0, PROTOCOL_MAGIC, false);
  // Version 1
  view.setUint16(4, PROTOCOL_VERSION, false);
  // Message Type
  view.setUint16(6, messageType, false);
  // Payload Length
  view.setUint32(8, payload.length, false);

  // Body
  buffer.set(payload, HEADER_SIZE);
  return buffer;
}

/**
 * Encodes a JSON object as a Linkora frame.
 */
export function encodeJsonFrame(messageType: MessageType, jsonObject: unknown): Uint8Array {
  const jsonString = JSON.stringify(jsonObject);
  const payload = new TextEncoder().encode(jsonString);
  return encodeFrame(messageType, payload);
}

/**
 * Decodes header from the first 12 bytes.
 */
export function decodeHeader(buffer: Uint8Array): FrameHeader {
  if (buffer.length < HEADER_SIZE) {
    throw new Error(`Buffer too short for frame header: ${buffer.length} < ${HEADER_SIZE}`);
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const magic = view.getUint32(0, false);
  if (magic !== PROTOCOL_MAGIC) {
    throw new Error(`Invalid magic bytes: 0x${magic.toString(16).toUpperCase()} !== 0x${PROTOCOL_MAGIC.toString(16)}`);
  }
  const version = view.getUint16(4, false);
  const messageType = view.getUint16(6, false) as MessageType;
  const payloadLength = view.getUint32(8, false);

  return { magic, version, messageType, payloadLength };
}

/**
 * Stream Frame Accumulator for TCP / WebSocket streaming.
 * Handles partial packets, chunk boundaries, and validates magic bytes.
 */
export class StreamFrameAccumulator {
  private buffer = new Uint8Array(0);

  public append(chunk: Uint8Array): DecodedFrame[] {
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer = combined;

    const frames: DecodedFrame[] = [];

    while (this.buffer.length >= HEADER_SIZE) {
      const header = decodeHeader(this.buffer);
      const totalExpected = HEADER_SIZE + header.payloadLength;

      if (this.buffer.length < totalExpected) {
        // Need more bytes for payload
        break;
      }

      const payload = this.buffer.subarray(HEADER_SIZE, totalExpected);
      frames.push({ header, payload });

      // Shift buffer forward
      this.buffer = this.buffer.subarray(totalExpected);
    }

    return frames;
  }

  public clear(): void {
    this.buffer = new Uint8Array(0);
  }

  public get pendingBytes(): number {
    return this.buffer.length;
  }
}
