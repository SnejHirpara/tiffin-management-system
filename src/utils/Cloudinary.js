import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadFileOnCloudinary = async (filePath) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        console.log(fileBuffer);

        new File()

        const base64String = Buffer.from(fileBuffer).toString('base64');
        console.log(base64String);

        if (!filePath) return null;

        const fileUploadResult = await cloudinary.uploader.upload(`data:image/png;base64,${base64String}`, {
            resource_type: 'image'
        });

        fs.unlinkSync(filePath);

        return fileUploadResult;
    } catch (error) {
        console.log("Upload file on server failed!!! ", error);
        fs.unlinkSync(filePath);

        return null;
    }
};