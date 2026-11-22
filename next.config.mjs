// The profile already proxies /achievement/api/* to this project's /api/*.
// Route the public Next chunks through that same origin on both entry points.
const assetPrefix = '/achievement/api/assets';

export default {
  reactStrictMode: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? assetPrefix : undefined,
  async rewrites() {
    return [assetPrefix, '/api/assets'].map(prefix => ({
      source: prefix + '/_next/static/:path*',
      destination: '/_next/static/:path*'
    }));
  }
};
