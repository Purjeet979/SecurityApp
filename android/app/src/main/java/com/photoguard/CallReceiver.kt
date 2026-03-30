package com.photoguard

import com.photoguard.R
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.widget.Toast
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.provider.ContactsContract
import android.net.Uri
import android.util.Log
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.os.Build
import kotlin.random.Random

class CallReceiver : BroadcastReceiver() {

    companion object {
        // Known Indian scam number patterns
        private val SCAM_PREFIXES = listOf(
            "+92", "0092",      // Pakistan ISD (common in India scam calls)
            "+1888", "+1800",   // Toll-free spoofed numbers
            "+44", "+91700",    // Spoofed international
            "7400366045",       // USER TEST NUMBER
        )

        private val SCAM_KEYWORDS_IN_NUMBER = listOf(
            "000000", "111111", "999999", "123456"  // Clearly fake numbers
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        var number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: "Unknown"

        if (state != TelephonyManager.EXTRA_STATE_RINGING) return

        // Clean number for better matching (remove spaces, dashes, +91)
        val cleanNumber = number.replace(Regex("[^0-9]"), "")
        
        // Debug Toast (Confirm receiver is firing)
        Handler(Looper.getMainLooper()).post {
             Toast.makeText(context, "Aegis checking call from: $number", Toast.LENGTH_SHORT).show()
        }

        // Check if caller is in Aegis's own block/scam list
        val prefs = context.getSharedPreferences("aegis_blocks", Context.MODE_PRIVATE)
        val blockedSenders = prefs.getStringSet("blocked_senders", emptySet()) ?: emptySet()
        val isInBlockList = blockedSenders.any { 
            val cleanBlocked = it.replace(Regex("[^0-9]"), "")
            cleanNumber.contains(cleanBlocked) || cleanBlocked.contains(cleanNumber) 
        }

        // Check for known scam number patterns
        val matchesScamPattern = SCAM_PREFIXES.any { 
            val cleanPattern = it.replace(Regex("[^0-9]"), "")
            if (cleanPattern.isEmpty()) false else cleanNumber.contains(cleanPattern)
        }

        if (number.isNullOrEmpty() || number.equals("Unknown", ignoreCase = true) || number.equals("Private", ignoreCase = true)) {
            Log.d("CallReceiver", "Incoming number is inaccessible ($number). Suppressing alert to avoid false positive.")
            return
        }

        val isContact = isContactInPhonebook(context, number)
        val prefs_trusted = context.getSharedPreferences("aegis_state", Context.MODE_PRIVATE)
        prefs_trusted.edit().putBoolean("is_active_call_trusted", isContact).apply()

        if (isContact) {
            Log.d("CallReceiver", "Trusted contact detected ($number). Suppressing alert.")
            return
        }

        if (isInBlockList || matchesScamPattern) {
            val reason = when {
                isInBlockList -> "This number was previously flagged by PhotoGuard"
                matchesScamPattern -> "Suspicious number pattern detected"
                else -> "Potential scam call"
            }
            showScamCallAlert(context, number, reason, isHighRisk = true)
        } else {
            // PROACTIVE: Alert for ANY unknown number
            val warning = "🛡️ UNKNOWN CALLER: Be safe.\nSigns of Scam:\n- Asking for OTP/Code\n- Claiming to be Police/CBI\n- Asking to open GPay/AnyDesk"
            showScamCallAlert(context, number, warning, isHighRisk = false)
        }
    }

    private fun isContactInPhonebook(context: Context, number: String): Boolean {
        if (number.isNullOrEmpty()) return false
        
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_CONTACTS) 
            != PackageManager.PERMISSION_GRANTED) {
            Log.e("CallReceiver", "READ_CONTACTS permission not granted.")
            return false
        }

        // Normalize incoming number (last 10 digits for Indian numbers)
        val cleanIncoming = number.replace(Regex("[^0-9]"), "")
        val searchNumber = if (cleanIncoming.length >= 10) cleanIncoming.takeLast(10) else cleanIncoming

        try {
            // High-performance PhoneLookup first
            val lookupUri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
            val projection = arrayOf(ContactsContract.PhoneLookup._ID, ContactsContract.PhoneLookup.DISPLAY_NAME)
            
            context.contentResolver.query(lookupUri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    Log.d("CallReceiver", "PhoneLookup match: $searchNumber")
                    return true
                }
            }

            // Fallback: Manual search in Data table if PhoneLookup misses
            val dataUri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
            val dataSelection = "${ContactsContract.CommonDataKinds.Phone.NUMBER} LIKE ?"
            val dataArgs = arrayOf("%$searchNumber") // Match last 10 digits
            
            context.contentResolver.query(dataUri, projection, dataSelection, dataArgs, null)?.use { cursor ->
                if (cursor.count > 0) {
                    Log.d("CallReceiver", "Manual data match: $searchNumber")
                    return true
                }
            }
        } catch (e: Exception) {
            Log.e("CallReceiver", "Error querying contacts: ${e.message}")
        }
        return false
    }

    private fun showScamCallAlert(context: Context, number: String, reason: String, isHighRisk: Boolean) {
        val CHANNEL_ID = "scam_alerts"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Scam Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Alerts for scam calls and messages"
            }
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            mgr.createNotificationChannel(channel)
        }

        val notifId = Random.nextInt()

        // Toast — visible immediately even while phone is ringing
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(
                context,
                "🔴 SCAM CALL ALERT!\nFrom: $number\n$reason",
                Toast.LENGTH_LONG
            ).show()
        }

        // Report intent → Sanchar Saathi
        val reportIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://sancharsaathi.gov.in")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val reportPending = PendingIntent.getActivity(
            context, notifId, reportIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(if (isHighRisk) "🚨 SCAM CALL ALERT!" else "🛡️ Unknown Caller Alert")
            .setContentText("From: $number — $reason")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("📞 Incoming call from $number\n\n⚠️ $reason\n\nDo NOT share OTP, bank details, or personal info!"))
            .setColor(if (isHighRisk) 0xFFDC2626.toInt() else 0xFFF59E0B.toInt())
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .setAutoCancel(true)
            .addAction(android.R.drawable.ic_menu_report_image, "🚨 Report Now", reportPending)
            .build()

        // NEW: Start Overlay Service for immediate visibility
        val overlayIntent = Intent(context, CallOverlayService::class.java).apply {
            putExtra("message", (if (isHighRisk) "🚨 SCAM ALERT: " else "🛡️ CAUTION: ") + reason)
            putExtra("isDanger", isHighRisk)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startService(overlayIntent)
        } else {
            context.startService(overlayIntent)
        }

        try {
            NotificationManagerCompat.from(context).notify(notifId, notification)
        } catch (e: SecurityException) {}
    }
}
