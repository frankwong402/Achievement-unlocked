// The profile forwards this exact static namespace to the standalone deployment.
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
