package com.linkora.android.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.nio.ByteBuffer
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

object KeystoreHelper {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "LinkoraIdentityKey"

    /**
     * Generates or retrieves an EC P-256 key pair backed by the Android Keystore (TEE or StrongBox).
     */
    fun getOrCreateIdentityKeyPair(): KeyStore.PrivateKeyEntry {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)
            val parameterSpec = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false) // Set to true when paired with BiometricPrompt CryptoObject
                .build()
            kpg.initialize(parameterSpec)
            kpg.generateKeyPair()
        }
        return keyStore.getEntry(KEY_ALIAS, null) as KeyStore.PrivateKeyEntry
    }

    fun signData(data: ByteArray, privateKey: java.security.PrivateKey): ByteArray {
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(privateKey)
        signer.update(data)
        return signer.sign()
    }

    fun sha256(data: ByteArray): ByteArray {
        return MessageDigest.getInstance("SHA-256").digest(data)
    }

    fun sha256Hex(data: ByteArray): String {
        return sha256(data).joinToString("") { "%02x".format(it) }
    }

    fun deriveSASCode(senderNonce: ByteArray, responderNonce: ByteArray, sharedSecret: ByteArray? = null): String {
        val totalLength = senderNonce.size + responderNonce.size + (sharedSecret?.size ?: 0)
        val combined = ByteBuffer.allocate(totalLength).apply {
            put(senderNonce)
            put(responderNonce)
            if (sharedSecret != null) put(sharedSecret)
        }.array()

        val digest = sha256(combined)
        val intVal = ByteBuffer.wrap(digest).getInt() and 0x7FFFFFFF
        val code = intVal % 1_000_000
        return "%06d".format(code)
    }

    fun encryptAesGcm(data: ByteArray, keyBytes: ByteArray, iv: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, iv)
        val key = SecretKeySpec(keyBytes, "AES")
        cipher.init(Cipher.ENCRYPT_MODE, key, spec)
        return cipher.doFinal(data)
    }

    fun decryptAesGcm(data: ByteArray, keyBytes: ByteArray, iv: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, iv)
        val key = SecretKeySpec(keyBytes, "AES")
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher.doFinal(data)
    }
}
