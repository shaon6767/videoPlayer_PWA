import { HomeFeed } from "@/components/HomeFeed";
import { getHomePageData } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof getHomePageData>> | undefined;
  try {
    data = await getHomePageData();
  } catch (error) {
    console.error("Could not load initial home page data.", error);
  }

  return (
    <HomeFeed
      initialVideos={data?.[0]}
      initialCategories={data?.[1].items}
    />
  );
}
