import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many searches, slow down" },
});

function createAuthLimiter(message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

export const loginLimiter = createAuthLimiter(
  "Too many login attempts. Try again in 15 minutes.",
);
export const registerLimiter = createAuthLimiter(
  "Too many registration attempts. Try again in 15 minutes.",
);
