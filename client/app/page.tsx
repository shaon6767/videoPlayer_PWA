import { HomeFeed } from "@/components/HomeFeed";
import { getHomePageData } from "@/lib/server-api";

export default async function HomePage() {
  try {
    const [initialVideos, categories] = await getHomePageData();
    return (
      <HomeFeed
        initialVideos={initialVideos}
        initialCategories={categories.items}
      />
    );
  } catch {
    return <HomeFeed />;
  }
}
