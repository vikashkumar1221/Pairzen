import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { createRelayServer } from "../dist/index.js";

const TEST_PORT = 9876;

test("Server health check and WebSocket zero-knowledge relay", async (t) => {
  const { server } = createRelayServer();
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  t.after(() => {
    server.close();
  });

  // Test 1: HTTP Health endpoint
  const res = await fetch(`http://localhost:${TEST_PORT}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "healthy");

  // Test 2: WebSocket Peer-to-Peer Relay
  const clientA = new WebSocket(`ws://localhost:${TEST_PORT}`);
  const clientB = new WebSocket(`ws://localhost:${TEST_PORT}`);

  await Promise.all([
    new Promise((resolve) => clientA.on("open", resolve)),
    new Promise((resolve) => clientB.on("open", resolve))
  ]);

  // Register Client A
  clientA.send(JSON.stringify({ type: "register", deviceId: "macbook-pro", publicKeyHex: "deadbeef01" }));
  await new Promise((resolve) => {
    clientA.once("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      assert.equal(msg.type, "registered");
      assert.equal(msg.deviceId, "macbook-pro");
      resolve(null);
    });
  });

  // Register Client B
  clientB.send(JSON.stringify({ type: "register", deviceId: "pixel-phone", publicKeyHex: "cafebabe02" }));
  await new Promise((resolve) => {
    clientB.once("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      assert.equal(msg.type, "registered");
      assert.equal(msg.deviceId, "pixel-phone");
      resolve(null);
    });
  });

  // Client A sends relayed encrypted payload to Client B
  const sampleCiphertext = "encrypted_aes_gcm_ciphertext_hex_sample";
  clientA.send(
    JSON.stringify({
      type: "relay",
      toDeviceId: "pixel-phone",
      payload: sampleCiphertext
    })
  );

  await new Promise((resolve) => {
    clientB.once("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      assert.equal(msg.type, "relayed_envelope");
      assert.equal(msg.fromDeviceId, "macbook-pro");
      assert.equal(msg.payload, sampleCiphertext);
      resolve(null);
    });
  });

  clientA.close();
  clientB.close();
});
