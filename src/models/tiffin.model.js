import mongoose, { Schema } from "mongoose";

const tiffinSchema = new Schema({
    count: {
        type: Number,
        required: true
    },
    reasonToCancelTiffin: {
        type: String
    }
}, { timestamps: true });

export const Tiffin = mongoose.model('Tiffin', tiffinSchema);