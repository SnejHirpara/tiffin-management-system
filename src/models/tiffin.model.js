import mongoose, { Schema } from "mongoose";
import { TiffinType } from "../enums/tiffin.enum.js";

const tiffinSchema = new Schema({
    count: {
        type: Number,
        required: true,
        min: 0,
        max: 2
    },
    type: {
        type: String,
        required: true,
        enum: [TiffinType.REGULAR, TiffinType.SWAMINARAYAN, TiffinType.JAIN],
        default: TiffinType.REGULAR
    },
    reasonForCancelOrLessThan2Tiffin: {
        type: String
    },
    takenBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    price: {
        type: Number,
        required: true,
        default: 90.00
    },
}, { timestamps: true });

export const Tiffin = mongoose.model('Tiffin', tiffinSchema);