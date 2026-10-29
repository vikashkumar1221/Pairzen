package com.linkora.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LinkoraAndroidTheme {
                LinkoraMobileApp(
                    onTriggerBiometric = { onApproved ->
                        showBiometricPrompt(onApproved)
                    }
                )
            }
        }
    }

    private fun showBiometricPrompt(onApproved: () -> Unit) {
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onApproved()
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Linkora Biometric Authorization")
            .setSubtitle("Approve Mac unlock request")
            .setDescription("Authenticate using your fingerprint or face to approve the MacBook session challenge.")
            .setNegativeButtonText("Cancel")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}

@Composable
fun LinkoraAndroidTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF3B82F6),
            secondary = Color(0xFF10B981),
            background = Color(0xFF121417),
            surface = Color(0xFF1C1F24),
            onPrimary = Color.White,
            onSurface = Color(0xFFE5E7EB)
        ),
        content = content
    )
}

enum class MobileScreen(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Default.Devices),
    FILES("Files", Icons.Default.Folder),
    CAMERA("Camera", Icons.Default.Videocam),
    REMOTE("Remote", Icons.Default.TouchApp),
    SECURITY("Security", Icons.Default.Security)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LinkoraMobileApp(onTriggerBiometric: (onApproved: () -> Unit) -> Unit) {
    var currentScreen by remember { mutableStateOf(MobileScreen.HOME) }
    var isConnectedToMac by remember { mutableStateOf(true) }
    var pairedMacName by remember { mutableStateOf("Vikash's MacBook Pro") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Linkora", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isConnectedToMac) Color(0xFF10B981).copy(alpha = 0.15f) else Color(0xFFEF4444).copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                if (isConnectedToMac) "CONNECTED" else "DISCONNECTED",
                                color = if (isConnectedToMac) Color(0xFF10B981) else Color(0xFFEF4444),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                MobileScreen.entries.forEach { screen ->
                    NavigationBarItem(
                        selected = currentScreen == screen,
                        onClick = { currentScreen = screen },
                        icon = { Icon(screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (currentScreen) {
                MobileScreen.HOME -> HomeScreen(
                    macName = pairedMacName,
                    isConnected = isConnectedToMac,
                    onNavigate = { currentScreen = it }
                )
                MobileScreen.FILES -> MobileFilesScreen()
                MobileScreen.CAMERA -> MobileCameraScreen()
                MobileScreen.REMOTE -> MobileRemoteScreen()
                MobileScreen.SECURITY -> MobileSecurityScreen(onTriggerBiometric)
            }
        }
    }
}

@Composable
fun HomeScreen(
    macName: String,
    isConnected: Boolean,
    onNavigate: (MobileScreen) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Paired Mac Status Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF3B82F6).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Laptop, contentDescription = null, tint = Color(0xFF3B82F6))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(macName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(
                            if (isConnected) "Active TLS Peer (192.168.1.100:8765)" else "Not in local Wi-Fi range",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (isConnected) Color.Green else Color.Red)
                    )
                }
                Divider(color = Color.DarkGray)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Battery: 84% • Wi-Fi 5GHz", fontSize = 12.sp, color = Color.Gray)
                    Text("E2EE Active", fontSize = 12.sp, color = Color(0xFF10B981))
                }
            }
        }

        Text("Quick Continuity Actions", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)

        // Action Grid
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuickActionTile(
                title = "Send Files",
                subtitle = "To MacBook",
                icon = Icons.Default.UploadFile,
                color = Color(0xFF3B82F6),
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(MobileScreen.FILES) }
            )
            QuickActionTile(
                title = "Webcam",
                subtitle = "1080p Stream",
                icon = Icons.Default.Videocam,
                color = Color(0xFF8B5CF6),
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(MobileScreen.CAMERA) }
            )
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuickActionTile(
                title = "Trackpad",
                subtitle = "Mac Pointer",
                icon = Icons.Default.TouchApp,
                color = Color(0xFF10B981),
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(MobileScreen.REMOTE) }
            )
            QuickActionTile(
                title = "Approve Unlock",
                subtitle = "Biometric Key",
                icon = Icons.Default.Fingerprint,
                color = Color(0xFFF59E0B),
                modifier = Modifier.weight(1f),
                onClick = { onNavigate(MobileScreen.SECURITY) }
            )
        }
    }
}

@Composable
fun QuickActionTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier.clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color)
            }
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(subtitle, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun MobileFilesScreen() {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Universal File Sharing", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text("Share photos, downloads, and videos to Mac over high-speed local TCP.", fontSize = 13.sp, color = Color.Gray)

        Button(
            onClick = { /* Pick file via Intent */ },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Select Photos & Files to Send")
        }

        Text("Recent Transfers", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf(
                "Presentation_Slides.key" to "38.2 MB • Sent • Verified",
                "Recording_20261029.mp4" to "142.8 MB • Received • Verified"
            )) { (name, info) ->
                Card(
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.InsertDriveFile, contentDescription = null, tint = Color(0xFF3B82F6))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text(info, fontSize = 12.sp, color = Color.Gray)
                        }
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981))
                    }
                }
            }
        }
    }
}

@Composable
fun MobileCameraScreen() {
    var isStreaming by remember { mutableStateOf(false) }
    var isBackCamera by remember { mutableStateOf(true) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Camera as Mac Webcam", fontWeight = FontWeight.Bold, fontSize = 18.sp)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color.Black),
            contentAlignment = Alignment.Center
        ) {
            if (isStreaming) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Videocam, contentDescription = null, tint = Color.Green, modifier = Modifier.size(48.dp))
                    Text("Streaming 1080p 60FPS to MacBook", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("Camera: ${if (isBackCamera) "Rear Ultrawide" else "Front 32MP"}", color = Color.LightGray, fontSize = 12.sp)
                }
            } else {
                Text("Camera stream stopped", color = Color.Gray)
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = { isStreaming = !isStreaming },
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = if (isStreaming) Color.Red else Color(0xFF3B82F6))
            ) {
                Text(if (isStreaming) "Stop Stream" else "Start Stream to Mac")
            }
            OutlinedButton(
                onClick = { isBackCamera = !isBackCamera },
                modifier = Modifier.weight(1f)
            ) {
                Text(if (isBackCamera) "Switch Front" else "Switch Rear")
            }
        }
    }
}

@Composable
fun MobileRemoteScreen() {
    var trackpadCoordinates by remember { mutableStateOf("0, 0") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Remote Trackpad for Mac", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text("Drag your finger to move the Mac mouse. Tap for click, two fingers to scroll.", fontSize = 13.sp, color = Color.Gray)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        trackpadCoordinates = "dx: ${dragAmount.x.toInt()}, dy: ${dragAmount.y.toInt()}"
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.TouchApp, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(40.dp))
                Text("Trackpad Surface Active", fontWeight = FontWeight.SemiBold)
                Text(trackpadCoordinates, fontSize = 12.sp, color = Color.Gray)
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = {}, modifier = Modifier.weight(1f)) {
                Text("Left Click")
            }
            OutlinedButton(onClick = {}, modifier = Modifier.weight(1f)) {
                Text("Right Click")
            }
        }
    }
}

@Composable
fun MobileSecurityScreen(onTriggerBiometric: (onApproved: () -> Unit) -> Unit) {
    var statusText by remember { mutableStateOf("Idle - Waiting for Mac challenge") }
    var approvedCount by remember { mutableStateOf(0) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Biometric Hardware Approval", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text("Approve Mac unlock and privileged operations using your Android Keystore key and BiometricPrompt.", fontSize = 13.sp, color = Color.Gray)

        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Hardware Key Status: StrongBox / TEE", fontWeight = FontWeight.Bold)
                Text("Algorithm: EC P-256 with SHA-256 with ECDSA", fontSize = 12.sp, color = Color.Gray)
                Text("Current state: $statusText", fontSize = 13.sp, color = Color(0xFF3B82F6))

                Button(
                    onClick = {
                        statusText = "Authenticating with BiometricPrompt…"
                        onTriggerBiometric {
                            approvedCount++
                            statusText = "Approved! Signed challenge #${approvedCount} with Keystore Private Key."
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Fingerprint, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Simulate Unlock Challenge Approval")
                }
            }
        }
    }
}
