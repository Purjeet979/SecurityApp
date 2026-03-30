package com.photoguard

import com.photoguard.R
import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import android.os.Handler
import android.os.Looper
import android.telephony.TelephonyManager

class AegisAccessibilityService : AccessibilityService() {

    private val monitoredPackages = setOf(
        "com.google.android.apps.nbu.paisa.user", // GPay
        "com.phonepe.app",                       // PhonePe
        "com.whatsapp",                          // WhatsApp (for link interception)
        "net.one97.paytm"                        // Paytm
    )

    private val SCAM_KEYWORDS = listOf(
        "digital arrest", "narcotics department", "cbi officer",
        "investigation", "aadhaar linked to drug", "arrest warrant",
        "transfer money to safe", "supreme court order", "account frozen",
        "share otp", "one time password", "tell me the code", "account verification",
        "last 4 digits", "card blocked", "kyc update"
    )

    private val SENSITIVE_APPS = setOf(
        "com.google.android.apps.nbu.paisa.user", // GPay
        "com.phonepe.app",                       // PhonePe
        "net.one97.paytm",                        // Paytm
        "com.anydesk.anydeskandroid",            // AnyDesk
        "com.teamviewer.teamviewer.market.mobile", // TeamViewer
        "com.microsoft.teams",                   // Teams
        "com.zoom.videomeetings"                 // Zoom
    )

    private var lastAlertTime = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: ""
        
        // CRITICAL: If the event is from our own app, IGNORE it. 
        // We don't want to detect scams inside the "Report Scam" screen!
        if (packageName == "com.photoguard") return
        
        // 1. App Launch Detection + Social Engineering Guard
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (monitoredPackages.contains(packageName) || SENSITIVE_APPS.contains(packageName)) {
                checkSocialEngineering(packageName)
            }
        }

        // 2. Real-time Content Scanning (for Live Captions / Scam Talk)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED || 
            event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            
            // Scan all windows if possible to find Live Captions (which might be in a system overlay)
            val allWindows = windows
            if (allWindows != null && allWindows.isNotEmpty()) {
                for (window in allWindows) {
                    val rootNode = window.root ?: continue
                    
                    // Also check package of individual nodes/windows to be extra safe
                    if (rootNode.packageName?.toString() == "com.photoguard") continue
                    
                    scanForScamKeywords(rootNode)
                }
            } else {
                // Fallback to active window
                val rootNode = rootInActiveWindow
                if (rootNode != null) {
                    scanForScamKeywords(rootNode)
                }
            }
        }
    }

    private fun scanForScamKeywords(node: android.view.accessibility.AccessibilityNodeInfo?) {
        if (node == null) return

        val text = node.text?.toString()?.lowercase() ?: ""
        if (text.isNotEmpty()) {
            Log.d("AegisScan", "Found text: $text") // Debugging: See what Aegis reads
            for (keyword in SCAM_KEYWORDS) {
                if (text.contains(keyword)) {
                    triggerScamTalkAlert(keyword)
                    return
                }
            }
        }

        for (i in 0 until node.childCount) {
            scanForScamKeywords(node.getChild(i))
        }
    }

    private fun triggerScamTalkAlert(keyword: String) {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastAlertTime < 10000) return // Throttle alerts to every 10s
        
        lastAlertTime = currentTime

        Handler(Looper.getMainLooper()).post {
            Toast.makeText(applicationContext, "🚨 SCAM TALK DETECTED!\nAegis found suspicious keyword: $keyword", Toast.LENGTH_LONG).show()
        }

        // NEW: Start Overlay Service for immediate visibility during the call
        val overlayIntent = Intent(this, CallOverlayService::class.java).apply {
            putExtra("message", "🚨 SCAM TALK: Found '$keyword'")
            putExtra("isDanger", true)
        }
        startService(overlayIntent)
        
        Log.e("AegisAccessibility", "🚨 SCAM TALK DETECTED via Accessibility: $keyword")
    }

    private fun checkSocialEngineering(packageName: String) {
        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val isCallActive = telephonyManager.callState != TelephonyManager.CALL_STATE_IDLE
        
        val prefs = getSharedPreferences("aegis_state", Context.MODE_PRIVATE)
        val isCallTrusted = prefs.getBoolean("is_active_call_trusted", false)

        if (isCallActive && !isCallTrusted && SENSITIVE_APPS.contains(packageName)) {
            // DANGER ZONE: User opened a bank/remote app DURING a call with an UNKNOWN number
            triggerSocialEngineeringAlert(packageName)
        } else if (monitoredPackages.contains(packageName)) {
            showAmbientProtectionToast(packageName)
        }
    }

    private fun triggerSocialEngineeringAlert(packageName: String) {
        val appName = packageName.split(".").last().capitalize()
        val overlayIntent = Intent(this, CallOverlayService::class.java).apply {
            putExtra("message", "🚨 SCAM WARNING: You are on a call and opened $appName. This is a common scam method. Do NOT share any codes!")
            putExtra("isDanger", true)
        }
        startService(overlayIntent)
        
        Log.e("AegisAccessibility", "🚨 SOCIAL ENGINEERING DETECTED: Call active + $packageName opened")
    }

    private fun showAmbientProtectionToast(packageName: String) {
        val appName = when(packageName) {
            "com.google.android.apps.nbu.paisa.user" -> "Google Pay"
            "com.phonepe.app" -> "PhonePe"
            "net.one97.paytm" -> "Paytm"
            "com.whatsapp" -> "WhatsApp"
            else -> "Payment App"
        }

        Handler(Looper.getMainLooper()).post {
            Toast.makeText(applicationContext, "🛡️ Aegis: Securing your $appName session...", Toast.LENGTH_SHORT).show()
        }
        
        Log.d("AegisAccessibility", "Detected $appName. Performing ambient scan...")
        // Future: Perform deeper OCR or intent analysis here
    }

    override fun onInterrupt() {
        Log.d("AegisAccessibility", "Service Interrupted")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d("AegisAccessibility", "Aegis Accessibility Service Connected")
    }
}
