package com.linkora.android.network

import java.nio.ByteBuffer
import java.nio.ByteOrder

object LinkoraProtocol {
    const val MAGIC: Int = 0x4C4E4B52 // "LNKR"
    const val VERSION: Short = 1
    const val HEADER_SIZE: Int = 12
    const val DEFAULT_PORT: Int = 8765
    const val SERVICE_TYPE: String = "_linkora._tcp."

    enum class MessageType(val value: Short) {
        HANDSHAKE_INIT(0x0001),
        HANDSHAKE_ACK(0x0002),
        HANDSHAKE_CONFIRM(0x0003),
        PING(0x0010),
        PONG(0x0011),
        DEVICE_STATUS(0x0020),
        CLIPBOARD_SYNC(0x0030),
        FILE_TRANSFER_REQUEST(0x0040),
        FILE_TRANSFER_ACCEPT(0x0041),
        FILE_TRANSFER_REJECT(0x0042),
        FILE_TRANSFER_CHUNK(0x0043),
        FILE_TRANSFER_COMPLETE(0x0044),
        FILE_TRANSFER_CANCEL(0x0045),
        CAMERA_STREAM_START(0x0050),
        CAMERA_STREAM_STOP(0x0051),
        CAMERA_FRAME(0x0052),
        REMOTE_INPUT_EVENT(0x0060),
        AUTH_CHALLENGE_REQUEST(0x0070),
        AUTH_CHALLENGE_RESPONSE(0x0071),
        NOTIFICATION_EVENT(0x0080),
        ERROR_RESPONSE(0x00FF.toShort());

        companion object {
            fun fromValue(value: Short): MessageType? = entries.find { it.value == value }
        }
    }

    data class FrameHeader(
        val magic: Int,
        val version: Short,
        val messageType: MessageType,
        val payloadLength: Int
    )

    data class DecodedFrame(
        val header: FrameHeader,
        val payload: ByteArray
    )

    fun encodeFrame(type: MessageType, payload: ByteArray): ByteArray {
        val totalLength = HEADER_SIZE + payload.size
        val buffer = ByteBuffer.allocate(totalLength).order(ByteOrder.BIG_ENDIAN)
        buffer.putInt(MAGIC)
        buffer.putShort(VERSION)
        buffer.putShort(type.value)
        buffer.putInt(payload.size)
        buffer.put(payload)
        return buffer.array()
    }

    fun decodeHeader(bytes: ByteArray): FrameHeader {
        require(bytes.size >= HEADER_SIZE) { "Buffer too short for frame header: ${bytes.size} < $HEADER_SIZE" }
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.BIG_ENDIAN)
        val magic = buffer.getInt()
        require(magic == MAGIC) { "Invalid magic bytes: 0x${Integer.toHexString(magic)}" }
        val version = buffer.getShort()
        val rawType = buffer.getShort()
        val type = MessageType.fromValue(rawType) ?: error("Unknown message type: $rawType")
        val payloadLength = buffer.getInt()
        return FrameHeader(magic, version, type, payloadLength)
    }

    class StreamAccumulator {
        private var buffer = ByteArray(0)

        @Synchronized
        fun append(chunk: ByteArray): List<DecodedFrame> {
            val combined = ByteArray(buffer.size + chunk.size)
            System.arraycopy(buffer, 0, combined, 0, buffer.size)
            System.arraycopy(chunk, 0, combined, buffer.size, chunk.size)
            buffer = combined

            val frames = mutableListOf<DecodedFrame>()

            while (buffer.size >= HEADER_SIZE) {
                val header = decodeHeader(buffer)
                val totalExpected = HEADER_SIZE + header.payloadLength
                if (buffer.size < totalExpected) {
                    break
                }
                val payload = ByteArray(header.payloadLength)
                System.arraycopy(buffer, HEADER_SIZE, payload, 0, header.payloadLength)
                frames.add(DecodedFrame(header, payload))

                val remaining = buffer.size - totalExpected
                val newBuffer = ByteArray(remaining)
                System.arraycopy(buffer, totalExpected, newBuffer, 0, remaining)
                buffer = newBuffer
            }

            return frames
        }

        @Synchronized
        fun clear() {
            buffer = ByteArray(0)
        }
    }
}
