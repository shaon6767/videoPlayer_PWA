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
      description: `${video.title} by ${video.channelTitle} — watch on Streamly.`,
      openGraph: {
        title: video.title,
        description: `${video.title} by ${video.channelTitle}`,
        images: [video.thumbnail],
      },
    };
  } catch {
    return { title: "Watch video on Streamly" };
  }
}

export default async function WatchPage({ params }: PageProps) {
  const { videoId } = await params;
  let initialVideo;
  try {
    initialVideo = await getVideoMetadata(videoId);
  } catch {
    initialVideo = undefined;
  }

  return <WatchContent videoId={videoId} initialVideo={initialVideo} />;
}
