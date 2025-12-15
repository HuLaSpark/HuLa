package com.plugin.hula

import android.app.Activity
import android.content.Context
import android.util.Base64
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

@InvokeArg
class PingArgs {
  var value: String? = null
}

@InvokeArg
class GetOrCreateSqliteKeyArgs {
  var service: String? = null
  var account: String? = null
}

@TauriPlugin
class ExamplePlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Example()

    private fun generateSqliteKey(): String {
        fun uuidSimple(): String = UUID.randomUUID().toString().replace("-", "")
        return "hula_" + uuidSimple() + uuidSimple()
    }

    private fun getPrefsName(service: String): String = "hula_secure_store_$service"

    private fun getOrCreateMasterKey(service: String): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val alias = "hula_sqlcipher_master_key_v1_$service"

        if (keyStore.containsAlias(alias)) {
            val entry = keyStore.getEntry(alias, null) as KeyStore.SecretKeyEntry
            return entry.secretKey
        }

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        val keySpec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()

        keyGenerator.init(keySpec)
        return keyGenerator.generateKey()
    }

    private fun encrypt(service: String, plaintext: String): String {
        val secretKey = getOrCreateMasterKey(service)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)

        val iv = cipher.iv
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

        val payload = ByteArray(1 + iv.size + ciphertext.size)
        payload[0] = iv.size.toByte()
        System.arraycopy(iv, 0, payload, 1, iv.size)
        System.arraycopy(ciphertext, 0, payload, 1 + iv.size, ciphertext.size)

        return Base64.encodeToString(payload, Base64.NO_WRAP)
    }

    private fun decrypt(service: String, encoded: String): String {
        val secretKey = getOrCreateMasterKey(service)
        val payload = Base64.decode(encoded, Base64.NO_WRAP)

        val ivSize = payload[0].toInt()
        val iv = payload.copyOfRange(1, 1 + ivSize)
        val ciphertext = payload.copyOfRange(1 + ivSize, payload.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, iv))
        val plaintext = cipher.doFinal(ciphertext)

        return String(plaintext, Charsets.UTF_8)
    }

    @Command
    fun ping(invoke: Invoke) {
        val args = invoke.parseArgs(PingArgs::class.java)

        val ret = JSObject()
        ret.put("value", implementation.pong(args.value ?: "default value :("))
        invoke.resolve(ret)
    }

    @Command
    fun getOrCreateSqliteKey(invoke: Invoke) {
        val args = invoke.parseArgs(GetOrCreateSqliteKeyArgs::class.java)
        val defaultService = "com.hula.pc"
        val defaultAccount = "hula_sqlcipher_key_v3"

        val service = args.service ?: defaultService
        val account = args.account ?: defaultAccount

        val prefs = activity.getSharedPreferences(getPrefsName(service), Context.MODE_PRIVATE)
        val stored = prefs.getString(account, null)

        val value = if (stored != null) {
            try {
                decrypt(service, stored)
            } catch (e: Exception) {
                invoke.reject("Failed to decrypt sqlite key from secure storage: ${e.message}")
                return
            }
        } else {
            val created = generateSqliteKey()
            val encrypted = encrypt(service, created)
            prefs.edit().putString(account, encrypted).apply()
            created
        }

        val ret = JSObject()
        ret.put("key", value)
        invoke.resolve(ret)
    }
}
