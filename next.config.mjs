const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/store', destination: 'https://palatial.store', permanent: true },
      { source: '/store/:path*', destination: 'https://palatial.store', permanent: true },
      { source: '/shop', destination: 'https://palatial.store', permanent: true },
      { source: '/shop/:path*', destination: 'https://palatial.store', permanent: true },
    ];
  },
};

export default nextConfig;
