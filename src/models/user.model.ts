import { model, Schema } from "mongoose";
import { languageArray, themeArray, userRoleArray } from "../common-folder/constants/constants";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { IUser, IUserMethods } from "../common-folder/interfaces/interfaces";
import { UserModel } from "../common-folder/types/types";

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
    username: {
        type: String,
        required: [true, "Username is required."],
        unique: true, // unique: true already creates a unique index. Adding index: true is redundant.
        trim: true,
        lowercase: true,
        match: [
            /^[A-Za-z][A-Za-z0-9_]{5,99}$/,
            "Username must start with a letter and contain only letters, numbers, and underscores."
        ]
    },
    email: {
        type: String,
        required: [true, "Email is required."],
        unique: true,
        trim: true,
        lowercase: true,
        immutable: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email address."
        ]
    },
    contact: {
        type: {
            countryCode: {
                type: String,
                required: [true, "Country code is required."],
                match: [
                    /^\+[1-9]\d{0,2}$/,
                    "Country code must be a valid calling code (e.g. +91)."
                ]
            },
            phone: {
                type: String,
                required: [true, "Phone number is required."],
                match: [
                    /^[0-9]{7,15}$/,
                    "Phone number must contain 7 to 15 digits."
                ]
            }
        },
        required: [true, "Contact details are required."],
        immutable: true
    },
    role: {
        type: String,
        enum: {
            values: userRoleArray,
            message: "Role must be one of: READER, AUTHOR, ADMIN."
        },
        required: [true, "Role is required."]
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: "/anonymous.svg" // now anonymous will be reserved for avatar -> if this value, anonymous user svg will be shown
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: {
            value: String,
            generatedAt: Date,
            expiresAt: Date
        },
        default: null
    },
    contactVerified: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: [true, "Password is required."],
        select: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    preferences: {
        theme: {
            type: String,
            enum: {
                values: themeArray,
                message: "Theme must be one of: Default."
            },
            default: "Default"
        },
        language: {
            type: String,
            enum: {
                values: languageArray,
                message: "Language must be one of: English."
            },
            default: "English"
        }
    },
    refreshToken: {
        type: String,
        default: ""
    }
}, {
    timestamps: true,
    toJSON: {
        // strip password hash, and otp value before any document is serialized to JSON
        transform: (_doc, ret) => {
            ret.password = "";
            ret.otp = null;
            return ret;
        }
    }
})

userSchema.index(
    {
        "contact.countryCode": 1,
        "contact.phone": 1,
    },
    { unique: true }
    // This (Option1: Indexing/Uniqueness) guarantees uniqueness at the database level.
    // Option 2: Manual validation - looks fine until two requests arrive simultaneously. 
    // This is called a race condition.
);

userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
        // pre("save") only runs for save() and create().
    }
})

userSchema.methods.isPasswordCorrect = async function (password: string) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    const secret = process.env.ACCESS_TOKEN_SECRET_KEY;

    if (!secret) {
        throw new Error("ACCESS_TOKEN_SECRET_KEY is not defined");
    }

    return jwt.sign(
        { _id: this._id, role: this.role },
        process.env.ACCESS_TOKEN_SECRET_KEY || "01234",
        { expiresIn: (process.env.ACCESS_TOKEN_EXPIRY as StringValue) || "20m" }
    )
}

userSchema.methods.generateRefreshToken = function () {
    const secret = process.env.REFRESH_TOKEN_SECRET_KEY;

    if (!secret) {
        throw new Error("REFRESH_TOKEN_SECRET_KEY is not defined");
    }

    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET_KEY || "56789",
        { expiresIn: (process.env.REFRESH_TOKEN_EXPIRY as StringValue) || "48h" }
    )
}

export const User = model("User", userSchema);
