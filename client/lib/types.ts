export type { VideoCategory, VideoPage, VideoSummary } from "../../shared/video";

export interface SavedVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  watchedAt?: string;
  addedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApiErrorResponse {
  message: string;
}
