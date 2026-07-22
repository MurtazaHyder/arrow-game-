package com.example

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.game.Arrow
import com.example.game.Direction
import com.example.game.LevelGenerator
import com.example.ui.theme.ArrowDark
import com.example.ui.theme.HeartRed
import com.example.ui.theme.PrimaryBlue
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

import kotlin.random.Random

data class GameParticle(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    val color: Color,
    val radius: Float,
    var alpha: Float = 1f,
    var life: Int = 0,
    val maxLife: Int = 30
)

@Composable
fun GameScreen(navController: NavController, level: Int) {
    var arrows by remember { mutableStateOf(LevelGenerator.generateLevel(level)) }
    val coroutineScope = rememberCoroutineScope()
    var lives by remember { mutableStateOf(3) }
    var activeParticles by remember { mutableStateOf(listOf<GameParticle>()) }

    // Particle animation loop
    LaunchedEffect(activeParticles.isNotEmpty()) {
        while (activeParticles.isNotEmpty()) {
            delay(16)
            activeParticles = activeParticles.mapNotNull { p ->
                p.life++
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.3f // Gravity
                p.vx *= 0.96f
                p.vy *= 0.96f
                p.alpha = 1f - (p.life.toFloat() / p.maxLife.toFloat())
                if (p.life < p.maxLife) p else null
            }
        }
    }
    
    // Check win condition
    LaunchedEffect(arrows) {
        if (arrows.isNotEmpty() && arrows.all { it.isRemoved }) {
            delay(500)
            navController.navigate("level_complete/$level") {
                popUpTo("main")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .statusBarsPadding()
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = PrimaryBlue)
            }
            Text("Level $level", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            IconButton(onClick = { }) {
                Icon(Icons.Default.Settings, contentDescription = "Settings", tint = PrimaryBlue)
            }
        }

        // Stats Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFF1F5F9))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text("🪙 6", fontWeight = FontWeight.Bold, color = ArrowDark)
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (i in 0 until 3) {
                    Icon(
                        Icons.Default.Favorite,
                        contentDescription = "Life",
                        tint = if (i < lives) HeartRed else Color.LightGray,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
            
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFF1F5F9))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(if (level > 10) "Hard" else "Normal", fontWeight = FontWeight.Medium, color = ArrowDark)
            }
        }

        // Game Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            if (arrows.isNotEmpty()) {
                val allCells = arrows.flatMap { it.getCells() }
                val minX = allCells.minOfOrNull { it.first } ?: 0
                val maxX = allCells.maxOfOrNull { it.first } ?: 0
                val minY = allCells.minOfOrNull { it.second } ?: 0
                val maxY = allCells.maxOfOrNull { it.second } ?: 0
                
                val cols = maxX - minX + 1
                val rows = maxY - minY + 1
                
                BoxWithConstraints(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    val cellSize = minOf(maxWidth.value / cols, maxHeight.value / rows).dp
                    
                    Box(modifier = Modifier.size(cellSize * cols, cellSize * rows)) {
                        arrows.forEach { arrow ->
                            if (!arrow.isRemoved) {
                                val widthCells = if (arrow.dir == Direction.LEFT || arrow.dir == Direction.RIGHT) arrow.length else 1
                                val heightCells = if (arrow.dir == Direction.UP || arrow.dir == Direction.DOWN) arrow.length else 1

                                val minBoxX = if (arrow.dir == Direction.RIGHT) arrow.x - arrow.length + 1 else arrow.x
                                val minBoxY = if (arrow.dir == Direction.DOWN) arrow.y - arrow.length + 1 else arrow.y

                                val offsetX = (minBoxX - minX) * cellSize.value
                                val offsetY = (minBoxY - minY) * cellSize.value

                                ArrowView(
                                    arrow = arrow,
                                    cellSize = cellSize,
                                    widthCells = widthCells,
                                    heightCells = heightCells,
                                    offsetX = offsetX,
                                    offsetY = offsetY,
                                    onTap = {
                                        // Check collision
                                        val isBlocked = arrows.any { other ->
                                            if (other.id == arrow.id || other.isRemoved) false
                                            else {
                                                val otherCells = other.getCells()
                                                var hit = false
                                                var rayX = arrow.x + arrow.dir.dx
                                                var rayY = arrow.y + arrow.dir.dy
                                                // Check up to a reasonable max board size
                                                for (i in 0 until 30) {
                                                    if (otherCells.contains(Pair(rayX, rayY))) {
                                                        hit = true
                                                        break
                                                    }
                                                    rayX += arrow.dir.dx
                                                    rayY += arrow.dir.dy
                                                }
                                                hit
                                            }
                                        }
                                        
                                        if (isBlocked) {
                                            if (lives > 0) lives--
                                            // Trigger shake animation
                                        } else {
                                            if (!arrow.isAnimating) {
                                                // Start animation
                                                arrows = arrows.map { if (it.id == arrow.id) it.copy(isAnimating = true) else it }
                                            }
                                        }
                                    },
                                    onAnimationComplete = {
                                        arrows = arrows.map { if (it.id == arrow.id) it.copy(isRemoved = true) else it }
                                        val colors = listOf(Color(0xFF3B82F6), Color(0xFF60A5FA), Color(0xFF34D399), Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF8B5CF6))
                                        val spawnX = offsetX + (widthCells * cellSize.value) / 2f
                                        val spawnY = offsetY + (heightCells * cellSize.value) / 2f
                                        val newParticles = (0..25).map {
                                            val angle = Random.nextFloat() * 2f * Math.PI.toFloat()
                                            val speed = Random.nextFloat() * 12f + 4f
                                            GameParticle(
                                                x = spawnX,
                                                y = spawnY,
                                                vx = kotlin.math.cos(angle) * speed,
                                                vy = kotlin.math.sin(angle) * speed,
                                                color = colors.random(),
                                                radius = Random.nextFloat() * 8f + 6f
                                            )
                                        }
                                        activeParticles = activeParticles + newParticles
                                    }
                                )
                            }
                        }

                        // Particle Canvas overlay
                        if (activeParticles.isNotEmpty()) {
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                activeParticles.forEach { p ->
                                    drawCircle(
                                        color = p.color,
                                        radius = p.radius,
                                        center = Offset(p.x, p.y),
                                        alpha = p.alpha.coerceIn(0f, 1f)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Bottom Hint Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .padding(4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("💡", fontSize = 28.sp)
                Badge(modifier = Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp)) {
                    Text("2")
                }
            }
            Spacer(modifier = Modifier.width(32.dp))
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                Text("#", fontSize = 28.sp, color = PrimaryBlue, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun ArrowView(
    arrow: Arrow,
    cellSize: androidx.compose.ui.unit.Dp,
    widthCells: Int,
    heightCells: Int,
    offsetX: Float,
    offsetY: Float,
    onTap: () -> Unit,
    onAnimationComplete: () -> Unit
) {
    val animOffsetX = remember { Animatable(offsetX) }
    val animOffsetY = remember { Animatable(offsetY) }
    val alphaAnim = remember { Animatable(1f) }
    val slideAnim = remember { Animatable(0f) }
    
    LaunchedEffect(offsetX, offsetY) {
        if (!arrow.isAnimating) {
            animOffsetX.snapTo(offsetX)
            animOffsetY.snapTo(offsetY)
        }
    }
    
    LaunchedEffect(arrow.isAnimating) {
        if (arrow.isAnimating) {
            launch {
                alphaAnim.animateTo(
                    targetValue = 0f,
                    animationSpec = tween(durationMillis = 650)
                )
            }
            launch {
                slideAnim.animateTo(
                    targetValue = 1000f,
                    animationSpec = tween(durationMillis = 650)
                )
            }
            delay(650)
            onAnimationComplete()
        }
    }

    val slideX = if (arrow.dir == Direction.RIGHT) slideAnim.value else if (arrow.dir == Direction.LEFT) -slideAnim.value else 0f
    val slideY = if (arrow.dir == Direction.DOWN) slideAnim.value else if (arrow.dir == Direction.UP) -slideAnim.value else 0f

    Canvas(
        modifier = Modifier
            .offset(animOffsetX.value.dp + slideX.dp, animOffsetY.value.dp + slideY.dp)
            .size(cellSize * widthCells, cellSize * heightCells)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { onTap() }
                )
            }
    ) {
        val baseSize = minOf(size.width / widthCells, size.height / heightCells)
        val strokeWidth = baseSize * 0.15f
        val padding = baseSize * 0.2f
        val color = ArrowDark.copy(alpha = alphaAnim.value)

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

        // Draw body
        drawLine(
            color = color,
            start = tail,
            end = end,
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )

        // Draw arrowhead
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
        drawPath(
            path = arrowHeadPath,
            color = color,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round)
        )
    }
}

