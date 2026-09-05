import { Router } from "express";
import { loginController, refreshTokenController, userRegisterController, verifyOTPController } from "../controllers/user.controllers";
import { rateLimiter } from "../common-folder/middlewares/rateLimit.middleware";

const userRouter = Router();

userRouter.route("/register").post(userRegisterController);

// this route can verify either of contact and email depending on the payload received
userRouter.route("/verify-otp").post(rateLimiter, verifyOTPController);

userRouter.route("/login").post(rateLimiter, loginController);

userRouter.route("/refresh-token").post(rateLimiter, refreshTokenController);

export default userRouter;