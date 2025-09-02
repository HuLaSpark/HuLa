package com.hula_ios.app

import android.graphics.Rect
import android.os.Bundle
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import android.view.ViewTreeObserver
import kotlin.math.roundToInt

class MainActivity : TauriActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 全屏 Edge-to-Edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)

        // 初始化 WebView 背景填充
        // webView.setBackgroundColor(0x00000000) // 透明，父布局背景可见

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
