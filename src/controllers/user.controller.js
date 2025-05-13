import mongoose from "mongoose";
import moment from "moment";

import { UserRole } from "../enums/user.enum.js";
import { Tiffin } from "../models/tiffin.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { updateFileOnAppwrite, uploadFileOnAppwrite } from "../utils/Appwrite.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = {
    httpOnly: true,
    secure: true
};

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("Error while generating access & refresh tokens: ", error);
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullName, email, password, role } = req.body;

    if (!username || !fullName || !email || !password || !role) {
        throw new ApiError(400, "User details are required");
    }

    if (!UserRole.isValid(role)) {
        throw new ApiError(400, "Invalid role. It should be either Admin or User.");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username is already exists");
    }

    const avatar = req.file?.path;
    console.log(req.file);
    if (!avatar) {
        throw new ApiError(400, 'Avatar image is required');
    }

    const avatarUploadedOnServerResult = await uploadFileOnAppwrite(avatar);

    if (!avatarUploadedOnServerResult) {
        throw new ApiError(500, "Avatar image upload on server failed");
    }

    const user = await User.create({
        username,
        fullName,
        email,
        password,
        role,
        avatar: avatarUploadedOnServerResult
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to register the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const user = await User.findOne({
        $or: [{ email }]
    });

    if (!user) throw new ApiError(404, "User doesn't exists");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(401, "Invalid password");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "User logged in successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    const existingAvatarId = req?.user?.avatar?.match(/(files)\/.*\//g).join("").split("/")[1];

    const newAvatar = req.file?.path;

    if (!newAvatar) throw new ApiError(400, "Avatar file is required");

    const updatedAvatarURL = await updateFileOnAppwrite(existingAvatarId, newAvatar);

    if (!updatedAvatarURL) throw new ApiError(500, "Error while uploading the avatar file");

    const user = await User.findByIdAndUpdate(req?.user?._id, {
        $set: {
            avatar: updatedAvatarURL
        }
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );
});

const updateCurrentPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) throw new ApiError(400, "New Password is required");

    const user = await User.findById(req?.user?._id);

    if (!user) throw new ApiError(401, "User doesn't exists");

    user.password = password;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password updated successfully")
    );
});

const getLoggedInUserTiffins = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const tiffins = await Tiffin.aggregate([
            {
                $match: {
                    takenBy: req.user._id
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "takenBy",
                    foreignField: "_id",
                    as: "takenByUser",
                    pipeline: [
                        {
                            $project: {
                                email: 1,
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                                role: 1,
                                createdAt: 1,
                                updatedAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    takenByUser: { "$arrayElemAt": ["$takenByUser", 0] }
                }
            },
            {
                $unset: "__v"
            }
        ]);

        return res.status(200).json(
            new ApiResponse(200, tiffins, "Tiffins for logged in user fetched successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Server Error while fetching tiffins for logged in user");
    }
});

const getAllUsersForCurrentLoggedInAdmin = asyncHandler(async (req, res) => {
    if (!req?.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (UserRole.isUser(req?.user?.role)) {
        throw new ApiError(400, "Role must be Admin in order to fetch all Users");
    }

    try {
        const usersForLoggedInAdmin = await User.aggregate([
            {
                $match: {
                    _id: { $ne: req.user._id }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "adminId",
                    as: "users",
                }
            },
            {
                $project: {
                    adminId: 1,
                    email: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    role: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);

        return res.status(200).json(
            new ApiResponse(200, usersForLoggedInAdmin, "All users for current logged in admin fetched successfully.")
        );
    } catch (error) {
        throw new ApiError(500, "Error while fetching users for currently logged in Admin.");
    }
});

const getNetTotalTiffinsInfoForAMonthAndYear = asyncHandler(async (req, res) => {
    if (!req?.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const { userId, year } = req.body;
    let { month } = req.body;

    if (!userId || !month || !year) {
        throw new ApiError(400, "Invalid payload - userId and month are required");
    }

    try {
        const userWithUserRole = await User.findById(userId);

        if (UserRole.isAdmin(userWithUserRole.role)) {
            throw new ApiError(400, "Provided userId is of Admin. User as Admin doesn't have tiffins. So, userId must be of User Role.");
        }

        month = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const monthStartDate = moment.utc(`${year}-${month}`, "YYYY-MMMM").startOf("month").startOf('day').toDate();
        const monthEndDate = moment.utc(`${year}-${month}`, "YYYY-MMMM").endOf("month").endOf('day').toDate();

        const netTotalInfo = await Tiffin.aggregate([
            {
                $match: {
                    $and: [
                        { takenBy: new mongoose.Types.ObjectId(userId) },
                        { createdAt: { $gte: monthStartDate, $lte: monthEndDate } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$takenBy",
                    totalTiffinsCount: {
                        $sum: "$count"
                    },
                    totalAmount: {
                        $sum: { $ifNull: ["$price", 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    totalTiffinsCount: 1,
                    totalAmount: 1,
                    month: month,
                    year: year,
                    user: {
                        email: 1,
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                        role: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            }
        ]);

        res.status(200).json(
            new ApiResponse(200, netTotalInfo[0] || {}, "Total amount for taken tiffins for a month is calculated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error while fetching net total tiffins info for a user for a particular month");
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req?.user?._id, {
        $unset: {
            refreshToken: 1
        }
    }, { new: true });

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    updateAvatar,
    updateCurrentPassword,
    getLoggedInUserTiffins,
    getAllUsersForCurrentLoggedInAdmin,
    getNetTotalTiffinsInfoForAMonthAndYear
};