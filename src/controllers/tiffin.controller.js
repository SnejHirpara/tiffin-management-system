import fs from "fs";
import path from "path";
import axios from "axios";

import mongoose from "mongoose";
import moment from "moment";
import puppeteer from "puppeteer";

import { TiffinType } from "../enums/tiffin.enum.js";
import { UserRole } from "../enums/user.enum.js";
import { Tiffin } from "../models/tiffin.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addTiffin = asyncHandler(async (req, res) => {
    if (UserRole.isAdmin(req?.user?.role)) {
        throw new ApiError(400, "Logged In user must have User Role in order to add tiffin.");
    }

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
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(
            new ApiResponse(200, { _id: tiffin._id }, "Tiffin added successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Internal Server error");
    }
});

const getDateWiseTiffinsAndNetTotalForAMonth = asyncHandler(async (req, res) => {
    if (!req?.user?._id) {
        throw new ApiError(401, "Unauthorizeed request");
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

        const dateWiseTiffinsInfoAndNetTotal = await Tiffin.aggregate([
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
                    dateWiseTiffinsCountAndInfo: {
                        $push: {
                            _id: "$_id",
                            count: "$count",
                            type: "$type",
                            reasonForCancelOrLessThan2Tiffin: "$reasonForCancelOrLessThan2Tiffin",
                            price: "$price",
                            createdAt: "$createdAt",
                            updatedAt: "$updatedAt",
                        }
                    },
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
                    dateWiseTiffinsCountAndInfo: 1,
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
            new ApiResponse(200, dateWiseTiffinsInfoAndNetTotal[0] || {}, "Total amount for taken tiffins for a month is calculated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error while fetching net total tiffins info for a user for a particular month");
    }
});

const generateTiffinBill = asyncHandler(async (req, res) => {
    if (!req?.user?._id) {
        throw new ApiError(401, "Unauthorizeed request");
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

        const reportData = await Tiffin.aggregate([
            {
                $match: {
                    $and: [
                        { takenBy: new mongoose.Types.ObjectId(userId) },
                        { createdAt: { $gte: monthStartDate, $lte: monthEndDate } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "takenBy",
                    foreignField: "_id",
                    as: "user",
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
            { $unwind: "$user" },
            { $match: { "user.role": "User" } },
            {
                $group: {
                    _id: "$takenBy",
                    userFullName: { $first: "$user.fullName" },
                    tiffins: {
                        $push: {
                            date: "$createdAt",
                            type: "$type",
                            count: "$count",
                            reasonForCancelOrLessThan2Tiffin: { $ifNull: ["$reasonForCancelOrLessThan2Tiffin", "-"] },
                            price: "$price"
                        }
                    },
                    totalTiffinsCount: { $sum: "$count" },
                    totalAmount: { $sum: { $ifNull: ["$price", 0] } },
                }
            },
            {
                $project: {
                    _id: 0,
                    userFullName: 1,
                    tiffins: 1,
                    totalTiffinsCount: 1,
                    totalAmount: 1,
                }
            }
        ]);

        if (!reportData?.length) {
            throw new ApiError(404, "No Tiffin data found for the given user, month and year.")
        }

        const { userFullName, tiffins, totalTiffinsCount, totalAmount } = reportData[0];

        // **Generate HTML Template**
        const htmlTemplate = `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; }
                .total-row { font-weight: bold; background-color: #f9f9f9; }
                .footer { display: flex; justify-content: space-between;
                    margin-top: 20px; font-size: 12px; text-align: center; color: #666;
                }
            </style>
        </head>
        <body>
            <h2>Tiffin Bill For Month of ${month}, ${year} - ${userFullName}</h2>
            <table>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reason For Cancel / < 2 Tiffins</th>
                    <th>Count</th>
                    <th>Price (₹)</th>
                </tr>
                ${tiffins.map(tiffin => `
                    <tr>
                        <td>${moment(tiffin.date).format("DD-MM-YYYY")}</td>
                        <td>${tiffin.type}</td>
                        <td>${tiffin.reasonForCancelOrLessThan2Tiffin}</td>
                        <td>${tiffin.count}</td>
                        <td>₹${parseFloat(tiffin.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>${totalTiffinsCount}</td>
                    <td>₹${parseFloat(totalAmount).toFixed(2)}</td>
                </tr>
            </table>
            <div class="footer">
                <span style="color: green;">* Price for 1 Tiffin (of all type) is: ₹90.00</span>
                Generated on ${moment().format("DD-MM-YYYY HH:mm:ss")}
            </div>
        </body>
        </html>`;

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlTemplate);

        const pathToPDFName = path.resolve() + "\\public\\temp";

        const pdfPath = path.join(pathToPDFName, `TiffinBill_${userFullName}_${month}_${year}.pdf`);
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

        await browser.close();

        // const whatsappSentMessageResponse = await sendWhatsAppPDF(pdfPath, "919726339294");

        res.status(200).download(pdfPath, (err) => {
            if (err) console.error("Download error:", err);
            fs.unlinkSync(pdfPath); // Delete file after sending
        });

        // return res.status(200).json(
        //     new ApiResponse(200, whatsappSentMessageResponse || {}, "Tiffin Bill Report sent in whatsapp successfully.")
        // );
    } catch (error) {
        throw new ApiError(500, `Error while generating a report for Tiffin Bill. ${error}`);
    }
});

async function sendWhatsAppPDF(filePath, recipientPhoneNumber) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfBase64 = pdfBuffer.toString('base64');

        const whatsappResponseAfterMessageSent = await axios.post(
            `${process.env.WHATSAPP_API_URL}${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: recipientPhoneNumber,
                type: "document",
                document: {
                    filename: "TiffinBill_Snej Hirpara_March_2025.pdf",
                    mime_type: "application/pdf",
                    data: pdfBase64,
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return whatsappResponseAfterMessageSent?.data;
    } catch (error) {
        throw new ApiError(500, `Error while sending message in whatsapp: ${error}`);
    }
}

const deleteTiffin = asyncHandler(async (req, res) => {
    if (!req?.user?.id) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const { id } = req.body;

        if (!id) {
            throw new ApiError(400, "id field of the Tiffin must be needed");
        }

        const deletedResult = await Tiffin.deleteOne({ _id: id });

        if (!deletedResult?.acknowledged) {
            throw new ApiError(500, "Tiffin deletion failed");
        }

        return res.status(200).json(
            new ApiResponse(200, {}, "Tiffin deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error while deleting the tiffin");
    }
});

export {
    addTiffin,
    getDateWiseTiffinsAndNetTotalForAMonth,
    generateTiffinBill,
    deleteTiffin
};