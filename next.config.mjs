// Serve JS/CSS from the separate app deployment when /achievement is reverse-proxied
// through the personal profile project on www.frankwong.dev.
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://achievement-unlocked-franky15.vercel.app'
    : undefined,
};

export default nextConfig;
