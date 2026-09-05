import { model, Schema } from "mongoose";

const UserActivitySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    date: {
        type: Date,
        required: true
    },
    articlesClickedForReading: {
        type: [String], // this will store articles' slug
        default: []
    },
    draftArticlesCreated: {
        type: Number,
        default: 0,
        min: 0
    },
    draftArticlesEdited: {
        type: Number, // this doesn't store how many distinct drafts have been edited. Rather it tells how many times on a day, an author edited the drafts. Even if an author edited same draft 10 times, this wil store 10
        default: 0,
        min: 0
    },
    articlesPublished: {
        type: Number,
        default: 0,
        min: 0
    },
    publishedArticlesEdited: {
        type: Number,
        default: 0,
        min: 0
    }
})

UserActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserActivity = model("UserActivity", UserActivitySchema);