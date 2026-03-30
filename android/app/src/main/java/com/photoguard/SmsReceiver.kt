package com.photoguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.telephony.SmsMessage
import android.widget.Toast
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import kotlin.random.Random

class SmsReceiver : BroadcastReceiver() {

    // Known scam keywords — check locally without internet
    private val SCAM_KEYWORDS = listOf(
        // English scam patterns
        "lottery", "won", "prize", "winner", "claim your",
        "click here", "verify", "otp", "one time password",
        "account blocked", "suspended", "kyc", "bank account",
        "link your aadhaar", "income tax refund", "refund credited",
        "work from home", "earn per day", "investment plan",
        "urgent", "immediately", "limited time",
        // Hindi/Hinglish patterns
        "bhejo", "accident", "hospital", "emergency", "fata fat",
        "paise bhejo", "lakh bhejo", "abhi karo", "turant",
        "jaldi", "bachao", "help me",
        // Fraud patterns
        "free recharge", "sim block", "sim expired",
        "your number will be deactivated", "congratulations",
        "selected for", "reward", "cashback", "crypto"
    )

    // Red Alert Keywords — triggers immediate 'danger' (Red)
    private val HIGH_RISK_KEYWORDS = listOf(
        "otp", "one time password", "pin code", "cvv", "kyc",
        "bank account blocked", "suspended", "verify your account",
        "digital arrest", "CBI", "ED officer", "drugs", "parcel"
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        val bundle: Bundle = intent.extras ?: return
        val pdus = bundle.get("pdus") as? Array<*> ?: return
        val format = bundle.getString("format") ?: "3gpp"

        val fullMessage = StringBuilder()
        var sender = "Unknown"

        for (pdu in pdus) {
            val smsMessage = SmsMessage.createFromPdu(pdu as ByteArray, format)
            fullMessage.append(smsMessage.messageBody)
            sender = smsMessage.originatingAddress ?: "Unknown"
        }

        val messageText = fullMessage.toString()

        // Clean number for better matching (remove spaces, etc)
        val cleanSender = sender.replace(Regex("[^0-9]"), "")

        // Check if sender is in Aegis's block list — silently ignore if blocked
        val prefs = context.getSharedPreferences("aegis_blocks", Context.MODE_PRIVATE)
        val blockedSenders = prefs.getStringSet("blocked_senders", emptySet()) ?: emptySet()
        if (blockedSenders.any { 
            val cleanBlocked = it.replace(Regex("[^0-9]"), "")
            cleanSender.contains(cleanBlocked) || cleanBlocked.contains(cleanSender)
        }) return  // silently drop

        val risk = analyzeLocally(messageText)

        // Only alert for Suspicious or Risky SMS — ignore safe messages silently
        if (risk != "safe") {
            val emoji = if (risk == "danger") "🔴" else "🟡"
            val label = if (risk == "danger") "SCAM DETECTED!" else "Suspicious Message"

            // Show Toast (float message visible even if app is open)
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(
                    context,
                    "$emoji $label\nFrom: $sender",
                    Toast.LENGTH_LONG
                ).show()
            }

            // Show heads-up notification
            showNotification(context, emoji, label, sender, risk)
        }
    }

    private fun analyzeLocally(text: String): String {
        val lower = text.lowercase()
        
        // 1. Check for Critical/High Risk Keywords first
        for (keyword in HIGH_RISK_KEYWORDS) {
            if (lower.contains(keyword.lowercase())) return "danger"
        }

        // 2. Otherwise calculate regular score
        var score = 0
        for (keyword in SCAM_KEYWORDS) {
            if (lower.contains(keyword.lowercase())) score += 20
        }
        score = score.coerceAtMost(100)

        return when {
            score >= 60 -> "danger"
            score >= 20 -> "medium"
            else -> "safe"
        }
    }

    private fun showNotification(context: Context, emoji: String, label: String, sender: String, risk: String) {
        val CHANNEL_ID = "scam_alerts"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Scam Alerts", NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Alerts for detected SMS scams" }
            val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            mgr.createNotificationChannel(channel)
        }

        val colorInt = if (risk == "danger") 0xFFDC2626.toInt() else 0xFFD97706.toInt()

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("$emoji $label")
            .setContentText("From: $sender — Tap to open Aegis")
            .setColor(colorInt)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(Random.nextInt(), notification)
        } catch (e: SecurityException) {
            // Notification permission not granted on Android 13+
        }
    }
}
