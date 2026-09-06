import { Router } from "express";
import { logoutController, userInfoController, getStreakController } from "../../controllers/protectedControllers/user.protectedControllers";
import { rateLimiter } from "../../common-folder/middlewares/rateLimit.middleware";

const protectedUserRouter = Router();

protectedUserRouter.route("/user-info").get(userInfoController);
protectedUserRouter.route("/user-info/performance").get(getStreakController);

protectedUserRouter.route("/logout").post(rateLimiter, logoutController);

export default protectedUserRouter;