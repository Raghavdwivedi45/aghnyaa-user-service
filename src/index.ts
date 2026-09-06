// Side-effect import: loads .env during the import phase, before any import
// below runs. Detailed explanation in README -> "Mailer & env loading order".
import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express"; // npm i -D @types/express-> so that TypeScript language server has type definitions for Express.
import { connectDB } from "./common-folder/db";
import healthcheckRouter from "./routes/healthcheck.routes";
import userRouter from "./routes/user.routes";
import { errorMiddleware } from "./common-folder/middlewares/error.middleware";
import { authMiddleware } from "./common-folder/middlewares/auth.middleware";
import protectedUserRouter from "./routes/protectedRoutes/user.protectedRoutes";
import userServiceRouter from "./routes/serviceRoutes/user.serviceRoutes";
import { connectRedis } from "./common-folder/utils/redis.client";

const port = process.env.PORT || 3500;
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGINS?.split(",") || [], credentials: true }))
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log("Server is running at port ", port);
        })
    })
    .catch((err) => {
        console.log("MongoDB Connection error: ", err);
    })

connectRedis()
    .then(() => {
        console.log("Redis Server Connected")
    })
    .catch((err) => {
        console.error("Redis Connection Error", err)
    })

// public routes
app.use("/v1/healthcheck", healthcheckRouter);
app.use("/v1/auth", userRouter);
app.use("/v1/service/auth", userServiceRouter);

// below this line, authMiddleware will insert basic user info from access token into req.user
// thus the protected endpoints (endpoints that require user info) should be placed after this
app.use(authMiddleware);

app.use("/protected/v1/auth", protectedUserRouter)


app.use(errorMiddleware);