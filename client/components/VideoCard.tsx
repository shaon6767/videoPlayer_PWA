import Image from "next/image";
import Link from "next/link";

interface Props {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  durationText?: string;
}

export function VideoCard({
  videoId,
  title,
  thumbnail,
  channelTitle,
  durationText,
}: Props) {
  return (
    <Link href={`/watch/${videoId}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted shadow-sm transition-shadow group-hover:shadow-md">
        <Image
          src={thumbnail}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {durationText && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {durationText}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
          {channelTitle ? channelTitle.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">
            {title}
          </h3>
          {channelTitle && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {channelTitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
