import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addTiffin } from "../controllers/tiffin.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addTiffin);

export default router;