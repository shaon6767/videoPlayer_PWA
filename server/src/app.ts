import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { generalLimiter } from "./middleware/rateLimiter.middleware";
import routes from "./routes";

const app = express();
app.set("trust proxy", 1);
app.set("etag", "weak");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://i.ytimg.com", "https://img.youtube.com"],
        frameSrc: ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
);
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(generalLimiter);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

app.use("/api", routes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(errorHandler);

export default app;