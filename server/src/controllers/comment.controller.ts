import { Response } from "express";
import { authenticatedUserId, AuthRequest } from "../middleware/auth.middleware";
import { Comment } from "../models/Comment";
import { z } from "zod";
import { commentBody } from "../validation/schemas";

type CommentBody = z.infer<typeof commentBody>;

export async function addComment(
  req: AuthRequest<CommentBody>,
  res: Response,
) {
  const comment = await Comment.create({
    user: authenticatedUserId(req),
    ...req.body,
  });
  const populated = await comment.populate("user", "name");
  res.status(201).json(populated);
}

export async function getComments(req: AuthRequest, res: Response) {
  const comments = await Comment.find({ videoId: req.params.videoId })
    .populate("user", "name")
    .sort({ createdAt: -1 });
  res.json(comments);
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });
  if (comment.user.toString() !== authenticatedUserId(req)) {
    return res.status(403).json({ message: "Not your comment" });
  }
  await comment.deleteOne();
  res.status(204).send();
}
