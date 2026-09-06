import { Request, Response } from "express"
import { asyncHandler } from "../../common-folder/utils/asyncHandler"
import { ApiResponse } from "../../common-folder/utils/apiResponse"
import { User } from "../../models/user.model";
import { ApiError } from "../../common-folder/utils/apiError";
import { UserStreak } from "../../models/userStreak.model";
import { cookieOptions, refreshTokenCookiePath } from "../../common-folder/constants/constants";

export const userInfoController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "You need to login first.");
    }
    const user = await User.findById(req.user._id);
    if (user?.role !== "AUTHOR") {
        throw new ApiError(401, "You are not eligible for this resource.");
    }
    return res.status(200).json(new ApiResponse(200, user, "User information retrieved successfully"))
})

export const getStreakController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "You need to login first.");
    }

    const streak = await UserStreak.findOne({ userId: req.user._id }).select("-lastActivityAt");
    const user = await User.findById(req.user._id).select("username");

    if (!streak || !user) {
        throw new ApiError(400, "No streak exists for this user.");
    }

    const response = { streak, user }
    
    return res.status(200).json(new ApiResponse(200, response, "User streak information retrieved successfully"))
})

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "You need to login first.");
    }
    const user = await User.findById(req.user?._id);
    if (!user || !user?.refreshToken) {
        throw new ApiError(401, "You need to login first.");
    }
    user.refreshToken = "";
    await user.save();

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", {
            ...cookieOptions,
            path: refreshTokenCookiePath
        })
        .json(new ApiResponse(200, null, "User logged out successfully"))
})