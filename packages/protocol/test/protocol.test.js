import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeJsonFrame,
  decodeHeader,
  StreamFrameAccumulator,
  MessageType,
  PROTOCOL_MAGIC,
  HEADER_SIZE,
  deriveSASCode,
  toHex,
  fromHex
} from "../dist/index.js";

test("Frame encoding and header decoding", () => {
  const sample = { hello: "linkora", count: 42 };
  const frame = encodeJsonFrame(MessageType.PING, sample);

  assert.ok(frame.length >= HEADER_SIZE);
  const header = decodeHeader(frame);
  assert.equal(header.magic, PROTOCOL_MAGIC);
  assert.equal(header.messageType, MessageType.PING);
  assert.equal(header.payloadLength, JSON.stringify(sample).length);
});

test("StreamFrameAccumulator handles partial and concatenated frames", () => {
  const acc = new StreamFrameAccumulator();

  const msg1 = encodeJsonFrame(MessageType.PING, { id: 1 });
  const msg2 = encodeJsonFrame(MessageType.PONG, { id: 2 });

  const combined = new Uint8Array(msg1.length + msg2.length);
  combined.set(msg1, 0);
  combined.set(msg2, msg1.length);

  // Send first half
  const half = Math.floor(combined.length / 2);
  const frames1 = acc.append(combined.subarray(0, half));
  assert.equal(frames1.length <= 1, true);

  // Send second half
  const frames2 = acc.append(combined.subarray(half));
  const totalFrames = [...frames1, ...frames2];

  assert.equal(totalFrames.length, 2);
  assert.equal(totalFrames[0].header.messageType, MessageType.PING);
  assert.equal(totalFrames[1].header.messageType, MessageType.PONG);
  assert.equal(acc.pendingBytes, 0);
});

test("SAS 6-digit code derivation is deterministic and format compliant", async () => {
  const nonceA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const nonceB = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]);

  const sas1 = await deriveSASCode(nonceA, nonceB);
  const sas2 = await deriveSASCode(nonceA, nonceB);

  assert.equal(sas1, sas2);
  assert.equal(sas1.length, 6);
  assert.match(sas1, /^[0-9]{6}$/);
});

test("Hex conversion roundtrip", () => {
  const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x99]);
  const hex = toHex(original);
  assert.equal(hex, "deadbeef0199");
  const parsed = fromHex(hex);
  assert.deepEqual(parsed, original);
});
