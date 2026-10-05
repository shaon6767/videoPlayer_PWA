import { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../errors";
import {
  YouTubeQuotaError,
  YouTubeServiceError,
} from "../services/youtubeApi.service";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  res.setHeader("Cache-Control", "no-store");

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    res.status(400).json({ message: "Malformed JSON request body" });
    return;
  }

  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    res.status(400).json({ message: "Invalid request data" });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    res.status(409).json({ message: "This record already exists" });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof YouTubeQuotaError) {
    res.status(429).json({ message: error.message });
    return;
  }

  if (error instanceof YouTubeServiceError) {
    res.status(502).json({ message: error.message });
    return;
  }

  console.error("Unhandled request error.", error);
  res.status(500).json({ message: "Something went wrong" });
};
