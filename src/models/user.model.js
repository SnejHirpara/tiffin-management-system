import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { UserRole } from "../enums/user.enum.js";

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true,
        index: true
    },
    fullName: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: [true, 'password is required'],
        minLength: 8
    },
    role: {
        type: String,
        required: true,
        enum: [UserRole.ADMIN, UserRole.USER],
    },
    adminId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        validate: {
            validator: function (value) {
                let isRoleUser = ((this.role === UserRole.ADMIN) && value) ? false : true;
                return isRoleUser;
            },
            message: "Only User role should have an adminId"
        }
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    });
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id,
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    });
}

export const User = mongoose.model('User', userSchema);