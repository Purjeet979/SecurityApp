package com.photoguard

import com.photoguard.R
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Button

class CallOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val message = intent?.getStringExtra("message") ?: "Potentially Suspicious Call"
        val isDanger = intent?.getBooleanExtra("isDanger", true) ?: true
        
        showOverlay(message, isDanger)
        return START_NOT_STICKY
    }

    private fun showOverlay(message: String, isDanger: Boolean) {
        if (overlayView != null) return // Already showing

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_scam_alert, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) 
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            else 
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP
            y = 100 // Margin from top
        }

        val alertText = overlayView?.findViewById<TextView>(R.id.alert_text)
        val closeBtn = overlayView?.findViewById<Button>(R.id.close_btn)

        alertText?.text = message
        if (isDanger) {
            overlayView?.setBackgroundResource(R.drawable.overlay_danger_bg)
        } else {
            overlayView?.setBackgroundResource(R.drawable.overlay_caution_bg)
        }

        closeBtn?.setOnClickListener {
            stopSelf()
        }

        windowManager?.addView(overlayView, params)
    }

    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
        }
    }
}
