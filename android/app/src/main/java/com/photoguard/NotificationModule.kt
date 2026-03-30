package com.photoguard

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlin.random.Random

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val CHANNEL_ID = "scam_alerts"

    init {
        createNotificationChannel()
    }

    override fun getName(): String {
        return "NotificationModule"
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Scam Alerts"
            val descriptionText = "Notifications for detected scams"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showNotification(options: ReadableMap) {
        val title = if (options.hasKey("title")) options.getString("title") else "Alert"
        val body  = if (options.hasKey("body"))  options.getString("body")  else ""
        val risk  = if (options.hasKey("risk"))  options.getString("risk")  else "low"
        // Sender passed from JS as data.sender (optional)
        val sender = if (options.hasKey("sender")) options.getString("sender") else "Unknown"

        var colorInt = 0xFF16A34A.toInt() // Green default
        if (options.hasKey("color")) {
            try { colorInt = options.getDouble("color").toLong().toInt() } catch (e: Exception) {}
        }

        val notifId = Random.nextInt()

        val builder = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setColor(colorInt)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)

        // Add Report action only for risky / suspicious messages
        if (risk == "high" || risk == "medium") {
            val reportIntent = Intent(reactApplicationContext, ActionReceiver::class.java).apply {
                action = ActionReceiver.ACTION_REPORT
                putExtra(ActionReceiver.EXTRA_SENDER, sender)
                putExtra(ActionReceiver.EXTRA_NOTIF_ID, notifId)
            }
            val reportPending = PendingIntent.getBroadcast(
                reactApplicationContext, notifId + 2, reportIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            builder.addAction(android.R.drawable.ic_menu_report_image, "🚨 Report", reportPending)
        }

        with(NotificationManagerCompat.from(reactApplicationContext)) {
            try {
                notify(notifId, builder.build())
            } catch (e: SecurityException) {
                // Notification permission not granted on Android 13+
            }
        }
    }
}
