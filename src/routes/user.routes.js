import { Router } from "express";
import {
    getLoggedInUserTiffins,
    loginUser,
    logoutUser,
    registerUser,
    updateAvatar,
    updateCurrentPassword
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(upload.single('avatar'), registerUser);
router.route("/login").post(loginUser);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/update-password").patch(verifyJWT, updateCurrentPassword);
router.route("/taken-tiffins").get(verifyJWT, getLoggedInUserTiffins);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;