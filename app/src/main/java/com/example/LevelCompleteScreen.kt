package com.example

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.game.Direction
import com.example.game.LevelGenerator
import com.example.ui.theme.ArrowDark
import com.example.ui.theme.PrimaryBlue

import androidx.compose.ui.platform.LocalContext
import androidx.compose.runtime.LaunchedEffect
import com.example.game.SaveManager

@Composable
fun LevelCompleteScreen(navController: NavController, level: Int) {
    val context = LocalContext.current
    LaunchedEffect(level) {
        SaveManager.saveLevel(context, level + 1)
    }

    val arrows = LevelGenerator.generateLevel(level)
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(Color(0xFF60A5FA), PrimaryBlue),
                    radius = 1500f
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(0.5f))
            
            Text(
                "Level Completed!",
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White)
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                // Draw the level layout
                if (arrows.isNotEmpty()) {
                    val allCells = arrows.flatMap { it.getCells() }
                    val minX = allCells.minOfOrNull { it.first } ?: 0
                    val maxX = allCells.maxOfOrNull { it.first } ?: 0
                    val minY = allCells.minOfOrNull { it.second } ?: 0
                    val maxY = allCells.maxOfOrNull { it.second } ?: 0
                    
                    val cols = maxX - minX + 1
                    val rows = maxY - minY + 1
                    
                    BoxWithConstraints(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        val cellSize = minOf(maxWidth.value / cols, maxHeight.value / rows).dp
                        
                        Box(modifier = Modifier.size(cellSize * cols, cellSize * rows)) {
                            arrows.forEach { arrow ->
                                val widthCells = if (arrow.dir == Direction.LEFT || arrow.dir == Direction.RIGHT) arrow.length else 1
                                val heightCells = if (arrow.dir == Direction.UP || arrow.dir == Direction.DOWN) arrow.length else 1

                                val minBoxX = if (arrow.dir == Direction.RIGHT) arrow.x - arrow.length + 1 else arrow.x
                                val minBoxY = if (arrow.dir == Direction.DOWN) arrow.y - arrow.length + 1 else arrow.y

                                val offsetX = (minBoxX - minX) * cellSize.value
                                val offsetY = (minBoxY - minY) * cellSize.value

                                Canvas(
                                    modifier = Modifier
                                        .offset(offsetX.dp, offsetY.dp)
                                        .size(cellSize * widthCells, cellSize * heightCells)
                                ) {
                                    val baseSize = minOf(size.width / widthCells, size.height / heightCells)
                                    val strokeWidth = baseSize * 0.15f
                                    val padding = baseSize * 0.2f
                                    val color = ArrowDark

                                    val end = when (arrow.dir) {
                                        Direction.UP -> Offset(size.width / 2, padding)
                                        Direction.DOWN -> Offset(size.width / 2, size.height - padding)
                                        Direction.LEFT -> Offset(padding, size.height / 2)
                                        Direction.RIGHT -> Offset(size.width - padding, size.height / 2)
                                    }
                                    val tail = when (arrow.dir) {
                                        Direction.UP -> Offset(size.width / 2, size.height - padding)
                                        Direction.DOWN -> Offset(size.width / 2, padding)
                                        Direction.LEFT -> Offset(size.width - padding, size.height / 2)
                                        Direction.RIGHT -> Offset(padding, size.height / 2)
                                    }

                                    drawLine(color = color, start = tail, end = end, strokeWidth = strokeWidth, cap = StrokeCap.Round)

                                    val arrowHeadSize = strokeWidth * 2.5f
                                    val arrowHeadPath = Path().apply {
                                        moveTo(end.x, end.y)
                                        when (arrow.dir) {
                                            Direction.UP -> {
                                                lineTo(end.x - arrowHeadSize, end.y + arrowHeadSize)
                                                moveTo(end.x, end.y)
                                                lineTo(end.x + arrowHeadSize, end.y + arrowHeadSize)
                                            }
                                            Direction.DOWN -> {
                                                lineTo(end.x - arrowHeadSize, end.y - arrowHeadSize)
                                                moveTo(end.x, end.y)
                                                lineTo(end.x + arrowHeadSize, end.y - arrowHeadSize)
                                            }
                                            Direction.LEFT -> {
                                                lineTo(end.x + arrowHeadSize, end.y - arrowHeadSize)
                                                moveTo(end.x, end.y)
                                                lineTo(end.x + arrowHeadSize, end.y + arrowHeadSize)
                                            }
                                            Direction.RIGHT -> {
                                                lineTo(end.x - arrowHeadSize, end.y - arrowHeadSize)
                                                moveTo(end.x, end.y)
                                                lineTo(end.x - arrowHeadSize, end.y + arrowHeadSize)
                                            }
                                        }
                                    }
                                    drawPath(path = arrowHeadPath, color = color, style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round))
                                }
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // Score & Progress Bar Animation
            val scoreAnim = remember { androidx.compose.animation.core.Animatable(0f) }
            LaunchedEffect(Unit) {
                scoreAnim.animateTo(
                    targetValue = 1f,
                    animationSpec = androidx.compose.animation.core.tween(
                        durationMillis = 1000,
                        easing = androidx.compose.animation.core.FastOutSlowInEasing
                    )
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.2f))
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Performance Score",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "${(scoreAnim.value * 100).toInt()}% (+100 PTS)",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(Color.White.copy(alpha = 0.3f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(scoreAnim.value)
                            .clip(RoundedCornerShape(7.dp))
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(Color(0xFFFFD700), Color(0xFF10B981))
                                )
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            
            Button(
                onClick = { navController.navigate("game/${level + 1}") {
                    popUpTo("main")
                } },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                shape = RoundedCornerShape(32.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Next Game", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                    Text("Level ${level + 1}", fontSize = 12.sp, color = PrimaryBlue.copy(alpha = 0.7f))
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            TextButton(
                onClick = { navController.navigate("main") {
                    popUpTo("main") { inclusive = true }
                } }
            ) {
                Text("Main", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

