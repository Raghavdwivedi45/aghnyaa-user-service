import { model, Schema } from "mongoose";
import { genreArray } from "../common-folder/constants/constants";

// Only users whose role === "AUTHOR" can have an AuthorInfo document. 
// In the service/controller add validation, before creating AuthorInfo

const authorInfoSchema = new Schema({
    authorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    aadharNumber: {
        type: String,
        required: true,
        match: [
            /^\d{12}$/,
            "Please enter a valid 12-digit Aadhar number."
        ]
    },
    about: {
        type: String,
        required: true
    },
    socialLinks: {
        twitter: String,
        instagram: String,
        linkedin: String,
        youtube: String,
        facebook: String
    },
    genres: {
        type: [String],
        enum: {
            values: genreArray,
            message: "Genre must be from the allowed list"
        } // validates every array element individually.
    },
    totalFollowers: {
        type: Number,
        default: 0
    }
})

export const AuthorInfo = model("AuthorInfo", authorInfoSchema);
