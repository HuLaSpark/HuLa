package com.hula_ios.app

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import android.Manifest
import androidx.activity.result.contract.ActivityResultContracts
import kotlin.math.roundToInt
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {

    private var splashHidden = false
    private var currentWebView: WebView? = null

    // Rust端通过JNI调用的实例方法
    @Suppress("unused")
    fun show() {
        // Rust端调用显示启动画面（启动时）
        android.util.Log.i("MainActivity", "✨ Splash show() called from Rust")
    }

    @Suppress("unused")
    fun hide() {
        // Rust端调用隐藏启动画面（应用启动完成）
        android.util.Log.i("MainActivity", "🎯 Splash hide() called from Rust - setting WebView background")
        
        runOnUiThread {
            hideStartupBackground()
        }
    }

    private fun hideStartupBackground() {
        if (!splashHidden) {
            splashHidden = true
            android.util.Log.d("MainActivity", "hideStartupBackground called, splashHidden set to true")
            
            // 使用保存的WebView引用
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
                // 这里可以根据权限是否授予做处理
                // e.g. if (!isGranted && permissionName == Manifest.permission.CAMERA) { ... }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val rootView: View = findViewById(android.R.id.content)

        ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
            val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
            val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

            // Here’s where you can tell the WebView (or your leptos viewport)
            // to resize/pad itself.
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

        // Android 13+ 使用 READ_MEDIA_* 权限
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            // 兼容旧版
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.Q) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }

        requestPermissionLauncher.launch(permissions.toTypedArray())
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        
        // 保存WebView引用
        currentWebView = webView

        // 初始化 WebView 背景填充
        webView.setBackgroundColor(0x00000000) // 透明，允许窗口背景延续启动图
        window.setBackgroundDrawableResource(R.drawable.launch_screen)
        splashHidden = false
        
        android.util.Log.i("MainActivity", "WebView created, waiting for Rust hide() call...")
    }
}
