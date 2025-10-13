package com.hula_ios.app

import android.os.Bundle
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import android.Manifest
import androidx.activity.result.contract.ActivityResultContracts
import kotlin.math.roundToInt

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
        super.onCreate(savedInstanceState)

        // 全屏 Edge-to-Edge
        WindowCompat.setDecorFitsSystemWindows(window, false)

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


        // 监听安全区 Insets 并注入 CSS 变量
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())

            val density = resources.displayMetrics.density

            val safeTop = maxOf(systemBars.top, displayCutout.top)
            val safeBottom = maxOf(systemBars.bottom, displayCutout.bottom)
            val safeLeft = maxOf(systemBars.left, displayCutout.left)
            val safeRight = maxOf(systemBars.right, displayCutout.right)

            val script = """
                document.documentElement.style.setProperty('--safe-area-inset-top', '${(safeTop/density).roundToInt()}px');
                document.documentElement.style.setProperty('--safe-area-inset-bottom', '${(safeBottom/density).roundToInt()}px');
                document.documentElement.style.setProperty('--safe-area-inset-left', '${(safeLeft/density).roundToInt()}px');
                document.documentElement.style.setProperty('--safe-area-inset-right', '${(safeRight/density).roundToInt()}px');
            """.trimIndent()

            webView.evaluateJavascript(script, null)
            insets
        }

        // 监听键盘弹出，并注入 CSS 变量 + 触发 JS 事件
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            val density = resources.displayMetrics.density
            val heightDp = (imeHeight / density).roundToInt()

            if (imeHeight > 0) {
                // 键盘显示
                val script = """
                    document.documentElement.style.setProperty('--keyboard-height', '${heightDp}px');
                    window.dispatchEvent(new CustomEvent('keyboardDidShow', {
                        detail: { height: $heightDp }
                    }));
                """.trimIndent()
                webView.evaluateJavascript(script, null)
            } else {
                // 键盘隐藏
                val script = """
                    document.documentElement.style.setProperty('--keyboard-height', '0px');
                    window.dispatchEvent(new CustomEvent('keyboardDidHide', {
                        detail: { height: 0 }
                    }));
                """.trimIndent()
                webView.evaluateJavascript(script, null)
            }
        
            insets
        }
    }
}
