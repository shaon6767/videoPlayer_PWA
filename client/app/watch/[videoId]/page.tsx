import type { Metadata } from "next";
import { WatchContent } from "@/components/WatchContent";
import { getVideoMetadata } from "@/lib/server-api";

interface PageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { videoId } = await params;
  try {
    const video = await getVideoMetadata(videoId);
    return {
      title: video.title,
      description: `${video.title} by ${video.channelTitle} — watch on Playlix.`,
      openGraph: {
        title: video.title,
        description: `${video.title} by ${video.channelTitle}`,
        images: [video.thumbnail],
      },
    };
  } catch (error) {
    console.error("Could not load video metadata for page title.", error);
    return { title: "Watch video on Playlix" };
  }
}

export default async function WatchPage({ params }: PageProps) {
  const { videoId } = await params;
  let initialVideo;
  try {
    initialVideo = await getVideoMetadata(videoId);
  } catch (error) {
    console.error("Could not load initial video metadata.", error);
    initialVideo = undefined;
  }

  return <WatchContent videoId={videoId} initialVideo={initialVideo} />;
}
