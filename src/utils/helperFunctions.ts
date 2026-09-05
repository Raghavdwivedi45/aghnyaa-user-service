import { UserStreak } from "../models/userStreak.model";

export const updateUserStreak = async (userId: string, date: Date) => {
    if (!date || !userId) return null;
    if (typeof userId !== "string") return null;

    const activityDay = new Date(date);
    activityDay.setUTCHours(0, 0, 0, 0);

    let user = await UserStreak.findOne({ userId });
    // First ever activity
    if (!user) {
        user = await UserStreak.create({ userId, lastActivityAt: date, currentStreak: 1, longestStreak: 1 });
        return user;
    }

    const lastDay = new Date(user.lastActivityAt);
    lastDay.setUTCHours(0, 0, 0, 0);

    const diffInDays = (activityDay.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24);

    if (diffInDays === 0) {
        return user; // Same day → don't increase streak
    }
    else if (diffInDays === 1) {
        user.currentStreak += 1; // Consecutive day
    } else if (diffInDays > 1) {
        user.currentStreak = 1; // Missed one or more days
    }

    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
    user.lastActivityAt = activityDay;
    await user.save();

    return user;
};