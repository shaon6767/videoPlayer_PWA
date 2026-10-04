import { withSerwist } from "@serwist/turbopack";

const apiOrigin = (process.env.API_SERVER_URL || "http://localhost:5000").replace(
  /\/$/,
  "",
);

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
