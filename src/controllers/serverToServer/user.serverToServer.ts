import { Request, Response } from "express"
import { ApiResponse } from "../../common-folder/utils/apiResponse"
import { asyncHandler } from "../../common-folder/utils/asyncHandler"
import { User } from "../../models/user.model";
import { ApiError } from "../../common-folder/utils/apiError";
import { UserActivity } from "../../models/userPerformance.model";
import { updateUserStreak } from "../../utils/helperFunctions";

export const userStatusController = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req?.params;
    if (!userId) {
        throw new ApiError(401, "User validation failed due to lack of information.");
    }
    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json(new ApiError(400, "User not found with given id!"))
    }
    const permissions = {
        emailVerified: user.emailVerified,
        cotactVerified: user.emailVerified,
        isBlocked: user.isBlocked,
        role: user.role
    }
    return res.status(200).json(new ApiResponse(200, permissions, "User status returned successfuly!"))
})

export const fetchAuthorInfoController = asyncHandler(async (req: Request, res: Response) => {
    const { userIds, nameOnly } = req.query;

    if (!userIds) {
        throw new ApiError(400, "User validation failed due to lack of information.");
    }

    const ids = String(userIds).split(",").map(id => id.trim()).filter(Boolean);

    const users = await User.find({ _id: { $in: ids } }).select(`username ${nameOnly ? "" : "avatar"}`);

    if (!users) {
        return res.status(400).json(new ApiError(400, "Users not found with given ids!"))
    }

    return res.status(200).json(new ApiResponse(200, users, "User information retrieved successfully!"))
})

export const updateUserPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req?.params;
    const { type, slug } = req?.body;

    if (!userId || (type === "article-read" && !slug) || !type) {
        return res.status(400).json(new ApiError(401, "User validation failed due to lack of information."));
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json(new ApiError(400, "User not found with given id!"))
    }

    const updateQuery: any = {}
    if (type === "article-read") {
        updateQuery.$addToSet = { articlesClickedForReading: slug };
    }
    else if (type === "draft-article-created") {
        updateQuery.$inc = { draftArticlesCreated: 1 };
    }
    else if (type === "draft-article-edited") {
        updateQuery.$inc = { draftArticlesEdited: 1 };
    }
    else if (type === "article-published") {
        updateQuery.$inc = { articlesPublished: 1 };
    }
    else if (type === "published-article-edited") {
        updateQuery.$inc = { publishedArticlesEdited: 1 };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    // this normalizes date to the start of the day. Effectively, one performance document per user per calendar day is created -> like 2026-08-08T00:00:00.000Z

    await UserActivity.findOneAndUpdate({ userId, date: today }, updateQuery, { upsert: true });
    if (typeof userId === "string") {
        await updateUserStreak(userId, today);
    }

    return res.status(200).json(new ApiResponse(200, {}, "User Performance updated successfuly!"))
})