import { Router } from "express";
import { serverToServerAuthMiddleware } from "../../common-folder/middlewares/serverToServer.middleware";
import { fetchAuthorInfoController, updateUserPerformance, userStatusController } from "../../controllers/serverToServer/user.serverToServer";

const userServiceRouter = Router();

userServiceRouter.use(serverToServerAuthMiddleware);

userServiceRouter.route("/").get(fetchAuthorInfoController);
userServiceRouter.route("/:userId/status").get(userStatusController);

userServiceRouter.route("/:userId/performance").patch(updateUserPerformance);

export default userServiceRouter;