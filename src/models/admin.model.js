import mongoose, { Schema } from "mongoose";

const adminSchema = new Schema({});

export const Admin = mongoose.model("Admin", adminSchema);