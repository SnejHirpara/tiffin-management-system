import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addTiffin, deleteTiffin } from "../controllers/tiffin.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addTiffin);
router.route("/delete-tiffin").delete(verifyJWT, deleteTiffin);

export default router;