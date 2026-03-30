package com.photoguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat

class ActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_BLOCK = "com.photoguard.ACTION_BLOCK"
        const val ACTION_REPORT = "com.photoguard.ACTION_REPORT"
        const val EXTRA_SENDER = "sender"
        const val EXTRA_NOTIF_ID = "notif_id"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val sender = intent.getStringExtra(EXTRA_SENDER) ?: "Unknown"
        val notifId = intent.getIntExtra(EXTRA_NOTIF_ID, -1)

        // Dismiss the notification first
        if (notifId != -1) {
            NotificationManagerCompat.from(context).cancel(notifId)
        }

        when (intent.action) {
            ACTION_BLOCK -> {
                // Save sender to PhotoGuard's own block list (SharedPreferences)
                val prefs = context.getSharedPreferences("photoguard_blocks", Context.MODE_PRIVATE)
                val blocked = prefs.getStringSet("blocked_senders", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
                blocked.add(sender.lowercase().trim())
                prefs.edit().putStringSet("blocked_senders", blocked).apply()

                Toast.makeText(
                    context,
                    "🚫 $sender blocked by PhotoGuard! Future messages will be silently ignored.",
                    Toast.LENGTH_LONG
                ).show()
            }

            ACTION_REPORT -> {
                Toast.makeText(
                    context,
                    "🚨 Opening Sanchar Saathi — Fill the complaint form to officially report $sender",
                    Toast.LENGTH_LONG
                ).show()

                // Open Sanchar Saathi home page (correct working URL)
                try {
                    val reportIntent = Intent(Intent.ACTION_VIEW).apply {
                        data = Uri.parse("https://sancharsaathi.gov.in")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(reportIntent)
                } catch (e: Exception) {
                    Toast.makeText(context, "Visit sancharsaathi.gov.in to report this scam", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
