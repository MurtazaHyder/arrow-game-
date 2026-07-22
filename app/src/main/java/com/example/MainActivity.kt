package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = MaterialTheme.colorScheme.background
        ) {
          val navController = rememberNavController()
          NavHost(navController = navController, startDestination = "welcome") {
            composable("welcome") { WelcomeScreen(navController) }
            composable("main") { MainScreen(navController) }
            composable("game/{level}") { backStackEntry ->
              val level = backStackEntry.arguments?.getString("level")?.toIntOrNull() ?: 1
              GameScreen(navController, level)
            }
            composable("level_complete/{level}") { backStackEntry ->
               val level = backStackEntry.arguments?.getString("level")?.toIntOrNull() ?: 1
               LevelCompleteScreen(navController, level)
            }
          }
        }
      }
    }
  }
}
