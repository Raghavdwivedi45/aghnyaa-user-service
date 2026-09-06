import { model, Schema } from "mongoose";

const UserStreakSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true
    },
    lastActivityAt: {
        type: Date,
        required: true
    },
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    longestStreak: {
        type: Number,
        default: 0,
        min: 0
    }
})
// whenever UserPerformance is updated, userStreak will also be updated
UserStreakSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserStreak = model("UserStreak", UserStreakSchema);