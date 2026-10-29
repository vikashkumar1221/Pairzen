package com.linkora.android.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class LinkoraNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        sbn ?: return

        // Ignore system ongoing notifications or Linkora's own foreground service
        if (sbn.packageName == packageName || sbn.isOngoing) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title.isBlank() && text.isBlank()) return

        Log.d("LinkoraNotification", "Captured notification from ${sbn.packageName}: $title - $text")

        // Payload will be packaged as NOTIFICATION_EVENT (0x0080) and sent over active TLS connection to Mac
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
