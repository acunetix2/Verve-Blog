/**
 * Streak Management Utility
 * Handles streak calculation and updates when users perform learning activities
 */

/**
 * Calculate and update user streak
 * @param {Object} user - User document
 * @returns {Object} - Updated streak data {currentStreak, maxStreak}
 */
export const updateUserStreak = (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
  let lastActivityDate = lastActivity ? new Date(lastActivity) : null;
  lastActivityDate?.setHours(0, 0, 0, 0);

  let currentStreak = user.currentStreak || 0;
  let maxStreak = user.maxStreak || 0;

  // If no previous activity, start a new streak
  if (!lastActivityDate) {
    currentStreak = 1;
    maxStreak = Math.max(maxStreak, 1);
  } else {
    const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if activity is today (0 day difference)
    if (daysDiff === 0) {
      // Already counted today, don't increment
      // currentStreak stays the same
    } 
    // Check if activity is yesterday (1 day difference) - continue streak
    else if (daysDiff === 1) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    }
    // If more than 1 day has passed, streak is broken
    else if (daysDiff > 1) {
      currentStreak = 1; // Reset to 1 for today's activity
      maxStreak = Math.max(maxStreak, 1);
    }
  }

  return {
    currentStreak,
    maxStreak,
    lastActivityDate: today
  };
};

/**
 * Get streak info for display
 * @param {Object} user - User document
 * @returns {Object} - Streak display info
 */
export const getStreakInfo = (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
  let lastActivityDate = lastActivity ? new Date(lastActivity) : null;
  lastActivityDate?.setHours(0, 0, 0, 0);

  const daysSinceLastActivity = lastActivityDate 
    ? Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : -1;

  return {
    currentStreak: user.currentStreak || 0,
    maxStreak: user.maxStreak || 0,
    lastActivityDate: user.lastActivityDate || null,
    isOnStreak: daysSinceLastActivity <= 1, // On streak if activity was today or yesterday
    daysSinceLastActivity: daysSinceLastActivity >= 0 ? daysSinceLastActivity : null,
  };
};

export default { updateUserStreak, getStreakInfo };
