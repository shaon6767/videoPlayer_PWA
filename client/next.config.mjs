import { withSerwist } from "@serwist/turbopack";

const apiOrigin = (
  process.env.API_SERVER_URL || "https://youtube-lite-qwmo.onrender.com"
).replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
