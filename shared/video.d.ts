export interface VideoSummary {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  durationText: string;
  categoryId?: string;
  description?: string;
  stats?: {
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
  };
}

export interface VideoPage {
  items: VideoSummary[];
  nextPageToken?: string;
  totalResults?: number;
}

export interface VideoCategory {
  id: string;
  title: string;
}
