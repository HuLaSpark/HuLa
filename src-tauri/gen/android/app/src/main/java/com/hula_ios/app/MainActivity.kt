package com.hula_ios.app

import android.os.Bundle
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Enable edge-to-edge display for SafeArea support
    WindowCompat.setDecorFitsSystemWindows(window, false)
  }
  
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    
    // Apply window insets for SafeArea support
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
      
      // Calculate safe area insets
      val safeAreaTop = maxOf(systemBars.top, displayCutout.top)
      val safeAreaBottom = maxOf(systemBars.bottom, displayCutout.bottom)
      val safeAreaLeft = maxOf(systemBars.left, displayCutout.left)
      val safeAreaRight = maxOf(systemBars.right, displayCutout.right)
      
      // Convert dp to px for CSS
      val density = resources.displayMetrics.density
      val topPx = (safeAreaTop / density).toInt()
      val bottomPx = (safeAreaBottom / density).toInt() 
      val leftPx = (safeAreaLeft / density).toInt()
      val rightPx = (safeAreaRight / density).toInt()
      
      // Inject CSS custom properties for safe area insets
      val script = """
        document.documentElement.style.setProperty('--safe-area-inset-top', '${topPx}px');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '${bottomPx}px');
        document.documentElement.style.setProperty('--safe-area-inset-left', '${leftPx}px');
        document.documentElement.style.setProperty('--safe-area-inset-right', '${rightPx}px');
        
        // Also set the standard env() CSS environment variables
        if (CSS && CSS.registerProperty) {
          try {
            CSS.registerProperty({
              name: '--safe-area-inset-top',
              syntax: '<length>',
              inherits: true,
              initialValue: '${topPx}px'
            });
            CSS.registerProperty({
              name: '--safe-area-inset-bottom', 
              syntax: '<length>',
              inherits: true,
              initialValue: '${bottomPx}px'
            });
            CSS.registerProperty({
              name: '--safe-area-inset-left',
              syntax: '<length>', 
              inherits: true,
              initialValue: '${leftPx}px'
            });
            CSS.registerProperty({
              name: '--safe-area-inset-right',
              syntax: '<length>',
              inherits: true, 
              initialValue: '${rightPx}px'
            });
          } catch(e) {}
        }
        
        // Dispatch custom event to notify app about safe area changes
        window.dispatchEvent(new CustomEvent('safeAreaChanged', {
          detail: { top: ${topPx}, bottom: ${bottomPx}, left: ${leftPx}, right: ${rightPx} }
        }));
      """.trimIndent()
      
      webView.evaluateJavascript(script, null)
      
      insets
    }
  }
}