package com.example.game

import kotlin.random.Random
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

enum class Direction(val dx: Int, val dy: Int) {
    UP(0, -1),
    RIGHT(1, 0),
    DOWN(0, 1),
    LEFT(-1, 0)
}

data class Arrow(
    val id: Int,
    val x: Int,       // Head X
    val y: Int,       // Head Y
    val length: Int,  // Number of cells it occupies
    val dir: Direction,
    var isRemoved: Boolean = false,
    var isShaking: Boolean = false,
    var isAnimating: Boolean = false,
    var animProgress: Float = 0f
) {
    fun getCells(): List<Pair<Int, Int>> {
        val cells = mutableListOf<Pair<Int, Int>>()
        for (i in 0 until length) {
            cells.add(Pair(x - dir.dx * i, y - dir.dy * i))
        }
        return cells
    }
}

object LevelGenerator {
    private fun getTargetArrowCount(level: Int): Int {
        val random = Random(level)
        return when {
            level == 1 -> random.nextInt(3, 6) // 3-5
            level == 2 -> random.nextInt(6, 9) // 6-8
            level == 3 -> random.nextInt(8, 11) // 8-10
            level == 4 -> random.nextInt(10, 13) // 10-12
            level == 5 -> random.nextInt(12, 16) // 12-15
            level < 10 -> random.nextInt(15 + (level - 6) * 2, 19 + (level - 6) * 2)
            else -> 20 + ((level - 10) * 2.5).toInt() + random.nextInt(0, 6)
        }
    }

    fun generateLevel(level: Int): List<Arrow> {
        val random = Random(level)
        val N = getTargetArrowCount(level)
        val size = min(15, max(5, ceil(sqrt(4.0 * N)).toInt()))
        val arrows = mutableListOf<Arrow>()
        var idCounter = 1

        for (i in 0 until N) {
            for (tries in 0 until 200) {
                val dir = Direction.values().random(random)
                val length = random.nextInt(2, 5)
                val x = random.nextInt(size)
                val y = random.nextInt(size)

                // Check fits
                var fits = true
                for (j in 0 until length) {
                    val cx = x - dir.dx * j
                    val cy = y - dir.dy * j
                    if (cx !in 0 until size || cy !in 0 until size) {
                        fits = false
                        break
                    }
                }
                if (!fits) continue

                // Check overlap
                val newCells = (0 until length).map { j -> Pair(x - dir.dx * j, y - dir.dy * j) }
                var overlaps = false
                for (arrow in arrows) {
                    val existingCells = arrow.getCells()
                    if (newCells.any { it in existingCells }) {
                        overlaps = true
                        break
                    }
                }
                if (overlaps) continue

                // Check forward path
                var pathClear = true
                var rayX = x + dir.dx
                var rayY = y + dir.dy
                for (k in 0 until 30) {
                    val cell = Pair(rayX, rayY)
                    for (arrow in arrows) {
                        if (cell in arrow.getCells()) {
                            pathClear = false
                            break
                        }
                    }
                    if (!pathClear) break
                    rayX += dir.dx
                    rayY += dir.dy
                }

                if (pathClear) {
                    arrows.add(Arrow(idCounter++, x, y, length, dir))
                    break
                }
            }
        }

        if (arrows.isEmpty()) {
            arrows.add(Arrow(1, 0, 0, 2, Direction.RIGHT))
        }
        return arrows
    }
}

