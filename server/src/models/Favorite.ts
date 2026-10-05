import { Schema, model, Types } from "mongoose";

export interface IFavorite {
  user: Types.ObjectId;
  videoId: string;
  title: string;
  thumbnail: string;
  addedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

favoriteSchema.index({ user: 1, videoId: 1 }, { unique: true });
favoriteSchema.index({ user: 1, addedAt: -1, _id: -1 });

export const Favorite = model<IFavorite>("Favorite", favoriteSchema);