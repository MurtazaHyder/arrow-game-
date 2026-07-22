package com.example

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.ui.platform.LocalContext
import androidx.compose.runtime.remember
import com.example.game.SaveManager
import com.example.ui.theme.PrimaryBlue

@Composable
fun MainScreen(navController: NavController) {
    val context = LocalContext.current
    val saveData = remember { SaveManager.load(context) }
    val currentLevel = saveData.level

    var showScoreboard by remember { mutableStateOf(false) }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Main") },
                    label = { Text("Main") },
                    selected = true,
                    onClick = { }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.CalendarToday, contentDescription = "Daily") },
                    label = { Text("Daily") },
                    selected = false,
                    onClick = { }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Person, contentDescription = "Me") },
                    label = { Text("Me") },
                    selected = false,
                    onClick = { showScoreboard = true }
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Daily Streak Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFFFF8E53))
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(
                    "🔥 ${saveData.streakCount} Day Streak",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Daily Challenge Card
            Box(
                modifier = Modifier
                    .size(200.dp, 200.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(PrimaryBlue),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color.White, modifier = Modifier.size(40.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("DAILY CHALLENGE", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("July 22", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { navController.navigate("game/$currentLevel") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text("Play", color = Color.White)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(28.dp))
            
            Text(
                "Arrow Puzzle",
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF1E293B)
            )
            
            Spacer(modifier = Modifier.height(28.dp))
            
            Button(
                onClick = { navController.navigate("game/$currentLevel") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp),
                shape = RoundedCornerShape(30.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("New Game", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Level $currentLevel", fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = { showScoreboard = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Text("🏆 Scoreboard", fontWeight = FontWeight.Bold, color = PrimaryBlue)
            }
        }
    }

    if (showScoreboard) {
        AlertDialog(
            onDismissRequest = { showScoreboard = false },
            title = { Text("🏆 Leaderboard & Stats", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("High Score:", fontWeight = FontWeight.SemiBold)
                        Text("${maxOf(saveData.highScore, saveData.score)} PTS", fontWeight = FontWeight.Bold, color = PrimaryBlue)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Levels Completed:", fontWeight = FontWeight.SemiBold)
                        Text("${saveData.levelsCompleted}", fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Daily Streak:", fontWeight = FontWeight.SemiBold)
                        Text("${saveData.streakCount} Days", fontWeight = FontWeight.Bold, color = Color(0xFFFF8E53))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showScoreboard = false }) {
                    Text("Close")
                }
            }
        )
    }
}
