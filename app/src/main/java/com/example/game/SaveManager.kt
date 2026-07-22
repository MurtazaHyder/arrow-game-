package com.example.game

import android.content.Context
import android.content.SharedPreferences

data class GameSaveData(
    val level: Int = 1,
    val score: Int = 0,
    val coins: Int = 6,
    val gems: Int = 0,
    val unlockedArrows: Set<String> = setOf("default"),
    val purchasedItems: Set<String> = emptySet(),
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val levelsCompleted: Int = 0,
    val streakCount: Int = 1,
    val lastLoginDate: String = "",
    val highScore: Int = 0
)

object SaveManager {
    private const val PREF_NAME = "arrow_puzzle_save"

    private fun getPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun load(context: Context): GameSaveData {
        val prefs = getPreferences(context)
        val level = prefs.getInt("level", 1)
        val score = prefs.getInt("score", 0)
        val coins = prefs.getInt("coins", 6)
        val gems = prefs.getInt("gems", 0)
        val unlockedArrows = prefs.getStringSet("unlocked_arrows", setOf("default")) ?: setOf("default")
        val purchasedItems = prefs.getStringSet("purchased_items", emptySet()) ?: emptySet()
        val sound = prefs.getBoolean("sound", true)
        val vibration = prefs.getBoolean("vibration", true)
        val levelsCompleted = prefs.getInt("levels_completed", 0)
        val streakCount = prefs.getInt("streak_count", 1)
        val lastLoginDate = prefs.getString("last_login_date", "") ?: ""
        val highScore = prefs.getInt("high_score", 0)

        return GameSaveData(
            level = level,
            score = score,
            coins = coins,
            gems = gems,
            unlockedArrows = unlockedArrows,
            purchasedItems = purchasedItems,
            soundEnabled = sound,
            vibrationEnabled = vibration,
            levelsCompleted = levelsCompleted,
            streakCount = streakCount,
            lastLoginDate = lastLoginDate,
            highScore = highScore
        )
    }

    fun save(context: Context, data: GameSaveData) {
        getPreferences(context).edit().apply {
            putInt("level", data.level)
            putInt("score", data.score)
            putInt("coins", data.coins)
            putInt("gems", data.gems)
            putStringSet("unlocked_arrows", data.unlockedArrows)
            putStringSet("purchased_items", data.purchasedItems)
            putBoolean("sound", data.soundEnabled)
            putBoolean("vibration", data.vibrationEnabled)
            putInt("levels_completed", data.levelsCompleted)
            putInt("streak_count", data.streakCount)
            putString("last_login_date", data.lastLoginDate)
            putInt("high_score", data.highScore)
            apply()
        }
    }

    fun saveLevel(context: Context, level: Int) {
        val data = load(context)
        save(context, data.copy(level = level, levelsCompleted = maxOf(data.levelsCompleted, level - 1)))
    }

    fun addCoins(context: Context, amount: Int) {
        val data = load(context)
        save(context, data.copy(coins = data.coins + amount))
    }

    fun addGems(context: Context, amount: Int) {
        val data = load(context)
        save(context, data.copy(gems = data.gems + amount))
    }

    fun purchaseItem(context: Context, itemId: String) {
        val data = load(context)
        val updated = data.purchasedItems.toMutableSet().apply { add(itemId) }
        save(context, data.copy(purchasedItems = updated))
    }

    fun updateSettings(context: Context, sound: Boolean, vibration: Boolean) {
        val data = load(context)
        save(context, data.copy(soundEnabled = sound, vibrationEnabled = vibration))
    }

    fun reset(context: Context) {
        getPreferences(context).edit().clear().apply()
    }
}
