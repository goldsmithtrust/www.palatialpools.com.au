// Build-time switch. Enable only with the matching edge proxy configuration.
// `env` inlines the same value into route handlers so they cannot diverge from redirects.
const sameDomainShop = process.env.SHOP_SAME_DOMAIN === '1';
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    SHOP_SAME_DOMAIN: sameDomainShop ? '1' : '',
  },
  async redirects() {
    if (sameDomainShop) return [
      { source: '/store', destination: '/shop', permanent: false },
      { source: '/store/:path*', destination: '/shop/:path*', permanent: false },
    ];
    return [
      { source: '/store', destination: 'https://palatial.store', permanent: true },
      { source: '/store/:path*', destination: 'https://palatial.store', permanent: true },
      { source: '/shop', destination: 'https://palatial.store', permanent: true },
      { source: '/shop/:path*', destination: 'https://palatial.store', permanent: true },
    ];
  },
};

export default nextConfig;
