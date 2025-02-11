import mongoose from "mongoose";
import { DB_NAME } from "../constants/db.constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`MongoDB Server Connected Successfully!!! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log('Database connection error...', error);
        process.exit(1);
    }
};

export default connectDB;