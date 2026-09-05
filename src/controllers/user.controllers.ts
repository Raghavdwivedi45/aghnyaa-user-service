import { Request, Response } from "express"
import { asyncHandler } from "../common-folder/utils/asyncHandler"
import { ApiResponse } from "../common-folder/utils/apiResponse"
import { ApiError } from "../common-folder/utils/apiError";
import { User } from "../models/user.model";
import { sendEmail } from "../common-folder/utils/mail.util";
import jwt from "jsonwebtoken";
import { IRefreshTokenPayload } from "../common-folder/interfaces/interfaces";

export const userRegisterController = asyncHandler(async (req: Request, res: Response) => {
    const requiredFields = ["username", "email", "role", "password"];

    for (const field of requiredFields) {
        if (!req.body?.[field]?.trim()) {
            throw new ApiError(400, `${field} is required.`); // 400 Bad Request
        }
    }

    if (!req.body?.contact?.countryCode || !req.body?.contact?.phone) {
        throw new ApiError(400, "Wrong phone number format");
    }

    const { username, email, contact, role, password } = req.body;

    // find user with same username, or email, or contact
    const exists = await User.findOne({
        $or: [
            { username },
            { email },
            { "contact.countryCode": contact.countryCode, "contact.phone": contact.phone }
        ]
    })

    if (exists) {
        throw new ApiError(409, "User already registered"); // 409 Conflict
    }

    const now = new Date();
    const otp = {
        value: Math.floor(100000 + Math.random() * 900000).toString(), // generate a random 6 digit number
        generatedAt: now,
        expiresAt: new Date(now.getTime() + (Number(process.env.OTP_EXPIRY_TIME) || 10 * 60 * 1000)) // 10 minutes
    };

    const newUser = new User({ username, email, contact, role, password, otp });

    const savedUser = await newUser.save();
    if (!savedUser) {
        throw new ApiError(500, "Failed to register the user.");
    }

    await sendEmail(
        email,
        "Welcome to Aghnyaa",
        `<h2>Your account has been created successfully.</h2>
        <p>Your OTP is ${otp.value} and it will expire in 10 minutes</p>
        `,
        "Your account has been created successfully."
    );

    // password, and otp stripped at schema level
    return res.status(201).json(new ApiResponse(201, savedUser, "User registered successfully")) // 201 Created
})

export const verifyOTPController = asyncHandler(async (req: Request, res: Response) => {
    const { email, contact, otp, username } = req?.body;
    if (!otp || otp.length != 6) {
        throw new ApiError(400, "Invalid OTP");
    }
    if (!email && !contact) {
        throw new ApiError(400, "Either email or contact is required");
    }

    if ((email && contact) || (username && contact)) {
        throw new ApiError(400, "Provide either email or contact, not both");
    }

    const query: Record<string, unknown> = {
        "otp.value": otp,
        "otp.expiresAt": {
            $gte: new Date,
        },
    };

    if (username && email) {
        query.$or = [
            { username },
            { email }
        ];
        query.emailVerified = false;
    }
    else if (email) {
        query.email = email;
        query.emailVerified = false;
    } else {
        query["contact.countryCode"] = contact.countryCode;
        query["contact.phone"] = contact.phone;
        query.contactVerified = false;
    }

    const registeredUser = await User.findOne(query);
    if (!registeredUser) {
        throw new ApiError(400, "Unregistered User!");
    }

    registeredUser.otp = null;

    if (email) {
        registeredUser.emailVerified = true;
    }
    else if (contact) {
        registeredUser.contactVerified = true
    }

    const savedUser = await registeredUser.save();
    const verifiedMessage = email ? "Email verified successfully" : "Contact verified successfully";
    return res.status(200).json(new ApiResponse(200, savedUser, verifiedMessage));

})

export const loginController = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password } = req?.body;

    if (!username && !email) {
        throw new ApiError(400, "Either username or email is required to login");
    }
    if (!password) {
        throw new ApiError(400, "Password is required to login");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] }).select("+password");
    const isPasswordCorrect = await user?.isPasswordCorrect(password);

    if (!user || !isPasswordCorrect) {
        throw new ApiError(401, "Invalid credentials");
    }

    if (!user?.emailVerified && !user?.contactVerified) { // this means user was not verified at the time of registration
        const now = new Date();
        const otp = {
            value: Math.floor(100000 + Math.random() * 900000).toString(), // generate a random 6 digit number
            generatedAt: now,
            expiresAt: new Date(now.getTime() + (Number(process.env.OTP_EXPIRY_TIME) || 10 * 60 * 1000)) // 10 minutes
        };

        user.otp = otp;
        await user?.save();

        await sendEmail(
            user.email,
            "Verify your Aghnyaa account",
            `<h2>Please verify your account to continue.</h2><p>Your OTP is ${otp.value} and it will expire in 10 minutes</p>`,
            "Please verify your account to continue."
        );

        throw new ApiError(402, "Please verify your email and try logging in again.");
    }

    const accessToken = user?.generateAccessToken();
    const refreshToken = user?.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    const loggedUser = await user.save();

    return res
        .status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "strict",
            maxAge: 20 * 60 * 1000 // 20 minutes
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
            sameSite: "strict",
            path: "/v1/auth/refresh-token"
        })
        .json(new ApiResponse(200, loggedUser, "User logged in successfully"));
})

export const refreshTokenController = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req?.cookies;
    if (!refreshToken) {
        throw new ApiError(401, "Token has expired. Please login again");
    }

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY || "") as IRefreshTokenPayload;
    if (!payload?._id) {
        throw new ApiError(401, "Token has expired. Please login again");
    }

    const user = await User.findOne({ _id: payload?._id, refreshToken });
    if (!user) {
        throw new ApiError(401, "Invalid user");
    }
    const accessToken = user?.generateAccessToken();
    user.lastLogin = new Date();
    const loggedUser = await user.save();

    return res
        .status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "strict",
            maxAge: 20 * 60 * 1000
        })
        .json(new ApiResponse(200, loggedUser, "User logged in successfully"));
})