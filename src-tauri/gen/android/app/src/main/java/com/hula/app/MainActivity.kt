package com.hula.app

import android.Manifest
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {

    private var splashHidden = false
    private var currentWebView: WebView? = null

    @Suppress("unused")
    fun show() {
        android.util.Log.i("MainActivity", "✨ Splash show() called from Rust")
    }

    @Suppress("unused")
    fun hide() {
        android.util.Log.i("MainActivity", "🎯 Splash hide() called from Rust - setting WebView background")
        runOnUiThread {
            hideStartupBackground()
        }
    }

    private fun hideStartupBackground() {
        if (!splashHidden) {
            splashHidden = true
            android.util.Log.d("MainActivity", "hideStartupBackground called, splashHidden set to true")
            currentWebView?.let {
                android.util.Log.d("MainActivity", "WebView reference found, setting background")
                it.setBackgroundColor(0xFFFFFFFF.toInt())
                window.setBackgroundDrawableResource(android.R.color.transparent)
                android.util.Log.i("MainActivity", "✅ WebView background set to opaque white")
            } ?: android.util.Log.e("MainActivity", "❌ WebView reference not found")
        } else {
            android.util.Log.w("MainActivity", "hideStartupBackground called but splashHidden already true")
        }
    }

    private val requestPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            permissions.entries.forEach { entry ->
                val permissionName = entry.key
                val isGranted = entry.value
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val rootView: View = findViewById(android.R.id.content)

        ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
            val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
            val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

            if (imeVisible) {
                v.setPadding(0, 0, 0, imeHeight)
            } else {
                v.setPadding(0, 0, 0, 0)
            }

            insets
        }

        requestPermissions()
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.Q) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }

        requestPermissionLauncher.launch(permissions.toTypedArray())
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        currentWebView = webView

        webView.setBackgroundColor(0x00000000)
        window.setBackgroundDrawableResource(R.drawable.launch_screen)
        splashHidden = false

        android.util.Log.i("MainActivity", "WebView created, waiting for Rust hide() call...")
    }
}
