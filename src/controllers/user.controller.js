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
    const { username, fullName, email, password } = req.body;

    if (!username || !fullName || !email || !password) {
        throw new ApiError(400, "User details are required");
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
    updateCurrentPassword
};