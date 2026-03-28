package com.photoguard

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
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
        val body = if (options.hasKey("body")) options.getString("body") else ""
        
        var colorInt = 0xFF16A34A.toInt() // Green default
        if (options.hasKey("color")) {
            try {
                colorInt = options.getDouble("color").toLong().toInt()
            } catch (e: Exception) {
                // Ignore
            }
        }

        val builder = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setColor(colorInt)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)

        with(NotificationManagerCompat.from(reactApplicationContext)) {
            try {
                notify(Random.nextInt(), builder.build())
            } catch (e: SecurityException) {
                // Permission not granted on Android 13+
            }
        }
    }
}
