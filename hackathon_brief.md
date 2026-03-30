# 🛡️ Aegis: Proactive Social Engineering Protection

Aegis is an advanced Android security suite designed to stop fraud **before it happens**. Unlike traditional antivirus apps, Aegis addresses the **"Human Element"** of scams—Real-time Social Engineering.

## 🚀 Problem & Solution
Scams today are rarely about malware; they are about **Social Engineering (Manipulation)**. Scammers use "Digital Arrest," "CBI/Police Impersonation," and "Screen Sharing" tactics to drain bank accounts. 

**Aegis solves this by monitoring user behavior in real-time.**

---

## 🔥 Key Features

### 1. Social Engineering Guard (USP)
*   **Behavioral Detection**: Uses a native [AccessibilityService](file:///c:/Users/PURJEET/.gemini/antigravity/scratch/PhotoGuard/android/app/src/main/java/com/photoguard/AegisAccessibilityService.kt#14-166) to detect if a user opens sensitive apps (GPay, PhonePe, AnyDesk, TeamViewer) **during an active call**.
*   **Smart Filtering**: Using `READ_CONTACTS` and `READ_CALL_LOG` permissions, Aegis suppresses alerts for saved contacts, ensuring 0% false positives for known people.
*   **Critical Overlays**: Triggers high-priority `SYSTEM_ALERT_WINDOW` warnings to snap the user out of the scammer's manipulation.

### 2. Call Overlay Shield
*   **Red Alert**: Instant warning for calls from known scam patterns or flagged numbers.
*   **Caution Yellow**: Proactive safety checklist for ALL unknown callers, reminding users:
    - *No bank asks for OTP/VC.*
    - *Police never calls for "Digital Arrest".*
    - *Don't open remote-access apps.*

### 3. Ambient Payment Protection
*   Automatically scans UPI intent links and requests.
*   Intercepts `upi://collect` requests to prevent unauthorized "Money Requests".

### 4. Phishing & QR Scanner
*   Built-in tools to verify suspicious links and QR codes for lookalike domains or hidden redirects.

---

## 🛠️ Technical Implementation
*   **Native Hybrid Architecture**: React Native (UI/Dashboard) + Native Kotlin (Security Core).
*   **Privacy-First (No Cloud dependence)**: All behavioral analysis and contact lookups happen **on-device**. We don't listen to the call content (Private/Secure); we monitor the **Call State & App State**.
*   **Robust Lookups**: Implemented custom [isContactInPhonebook](file:///c:/Users/PURJEET/.gemini/antigravity/scratch/PhotoGuard/android/app/src/main/java/com/photoguard/CallReceiver.kt#96-137) logic with normalized 10-digit matching (`LIKE %10digits`) to handle regional number formatting errors.

---

## 💡 Why Aegis wins?
1.  **Device Agnostic**: Doesn't require high-end AI features like Samsung’s "Call Assist" or Google’s "Live Caption". Works on any Android phone.
2.  **Psychological Defense**: It treats the scam as a psychological process, providing a **"Digital Brake"** when a user is under stress.
3.  **Low Resource Overhead**: Native services are optimized for battery and performance.

---

# 🎤 Presentation Tips for Judges
-   **Show, Don't Just Tell**: Demonstrate opening **AnyDesk** while on an **Unknown Call**. Let them see the RED ALERT.
-   **Explain the Pivot**: Mention that we initially planned for Transcripts, but pivoted to **Behavioral Detection** to support 100% of Android devices, not just the premium ones.
-   **Focus on Impact**: "Aegis is the difference between a life-savings-drained call and a 'Call Disconnected' button."
