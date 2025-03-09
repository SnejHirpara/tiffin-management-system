import { TiffinType } from "../enums/tiffin.enum.js";
import { Tiffin } from "../models/tiffin.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addTiffin = asyncHandler(async (req, res) => {
    const { count, type, takenBy, price } = req.body;
    let { reasonForCancelOrLessThan2Tiffin } = req.body;

    if (!count || !type || !takenBy || !price) {
        throw new ApiError(400, "Invalid tiffin data provided");
    }

    if (!TiffinType.isValid(type)) {
        throw new ApiError(400, "Invalid tiffin type");
    }

    if (count < 2 && !reasonForCancelOrLessThan2Tiffin) {
        throw new ApiError(400, "Reason for cancel or less than 2 tiffin must be provided");
    } else if (count === 2) {
        reasonForCancelOrLessThan2Tiffin = null;
    }

    try {
        const tiffin = await Tiffin.create({
            count,
            type,
            reasonForCancelOrLessThan2Tiffin,
            takenBy,
            price
        });

        if (!tiffin) {
            throw new ApiError(500, "Tiffin saving failed due to internal server error");
        }

        const user = await User.findById(takenBy);

        user.tiffins.push(tiffin);
        await user.save({ validateBeforeSave: false });

        return res.status(200).json(
            new ApiResponse(200, { _id: tiffin._id }, "Tiffin added successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Internal Server error");
    }
});

export {
    addTiffin
};