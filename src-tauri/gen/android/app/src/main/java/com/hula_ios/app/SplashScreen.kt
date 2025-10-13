package com.hula_ios.app

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.appcompat.widget.AppCompatImageView

object SplashScreen {
    private var overlay: FrameLayout? = null

    @JvmStatic
    fun show(activity: Activity) {
        activity.runOnUiThread {
            val parent = activity.findViewById<ViewGroup>(android.R.id.content) ?: return@runOnUiThread
            val splashView = overlay ?: FrameLayout(activity).apply {
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                setBackgroundResource(R.color.splash_background)
                isClickable = true
                isFocusable = true

                val imageView = AppCompatImageView(activity).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    scaleType = ImageView.ScaleType.CENTER_CROP
                    setImageResource(R.drawable.splash)
                    contentDescription = "Splash"
                }
                addView(imageView)
            }.also {
                overlay = it
            }

            if (splashView.parent == null) {
                parent.addView(splashView)
            }
            splashView.animate().cancel()
            splashView.alpha = 1f
            splashView.visibility = View.VISIBLE

            activity.window.setBackgroundDrawableResource(R.drawable.launch_screen)
        }
    }

    @JvmStatic
    fun hide(activity: Activity) {
        activity.runOnUiThread {
            val parent = activity.findViewById<ViewGroup>(android.R.id.content)
            val currentOverlay = overlay

            val clearWindow: () -> Unit = {
                activity.window.setBackgroundDrawableResource(android.R.color.transparent)
            }

            if (currentOverlay == null) {
                clearWindow()
                return@runOnUiThread
            }

            val removeAction = {
                currentOverlay.animate().cancel()
                parent?.removeView(currentOverlay)
                overlay = null
                clearWindow()
            }

            currentOverlay.animate().cancel()
            currentOverlay.animate()
                .alpha(0f)
                .setDuration(250L)
                .withEndAction(removeAction)
                .start()

            currentOverlay.postDelayed(removeAction, 400L)
        }
    }
}
