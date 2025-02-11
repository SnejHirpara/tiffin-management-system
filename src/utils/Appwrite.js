import fs from "fs";
import { Client, ID, Storage } from "appwrite";
import { extname, basename } from "path";
import { File } from "buffer";

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_TMS_PROJECT_ID);

const storage = new Storage(client);

export const uploadFileOnAppwrite = async (filePath) => {
    try {
        const fileExtension = extname(filePath);
        const fileName = basename(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: `image/${fileExtension.slice(1).toLowerCase()}` });

        const jsFileObject = new File([blob], fileName);

        const file = await storage.createFile(process.env.APPWRITE_TMS_BUCKET_ID, ID.unique(), jsFileObject);

        const uploadedFileURL = storage.getFilePreview(process.env.APPWRITE_TMS_BUCKET_ID, file.$id);

        fs.unlinkSync(filePath);

        return uploadedFileURL;
    } catch (error) {
        console.log("Error while uploading the file: ", error);
        fs.unlinkSync(filePath);

        return null;
    }
};

export const updateFileOnAppwrite = async (oldFileId, filePath) => {
    try {
        const isDeletedOldFileSuccessfully = await deleteFileOnAppwrite(oldFileId);

        if (!isDeletedOldFileSuccessfully) throw new ApiError(500, "Error while deleting the old file");

        const fileExtension = extname(filePath);
        const fileName = basename(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: `image/${fileExtension.slice(1).toLowerCase()}` });

        const jsFileObject = new File([blob], fileName);

        const newFile = await storage.createFile(process.env.APPWRITE_TMS_BUCKET_ID, ID.unique(), jsFileObject);

        const updatedFileURL = storage.getFilePreview(process.env.APPWRITE_TMS_BUCKET_ID, newFile.$id);

        fs.unlinkSync(filePath);

        return updatedFileURL;
    } catch (error) {
        console.log("Error while updating the file: ", error);
        fs.unlinkSync(filePath);

        return null;
    }
};

export const deleteFileOnAppwrite = async (fileId) => {
    try {
        await storage.deleteFile(
            process.env.APPWRITE_TMS_BUCKET_ID,
            fileId
        );

        return true;
    } catch (error) {
        console.log("Error while deleting the file: ", error);

        return false;
    }
};