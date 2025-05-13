import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addTiffin,
    deleteTiffin,
    generateTiffinBill,
    getDateWiseTiffinsAndNetTotalForAMonth
} from "../controllers/tiffin.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addTiffin);
router.route("/datewise-tiffins-info").post(verifyJWT, getDateWiseTiffinsAndNetTotalForAMonth);
router.route("/generate-report").post(verifyJWT, generateTiffinBill);
router.route("/delete-tiffin").delete(verifyJWT, deleteTiffin);

export default router;