/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      perf_hooks: false,
      crypto: false,
    };
    return config;
  },
  images: {
    domains: ['avatar.vercel.sh'],
  },
};

module.exports = nextConfig; 