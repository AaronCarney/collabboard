/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@collabboard/shared', '@collabboard/ui'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // langfuse and langsmith are optional observability deps —
      // only loaded via dynamic import() when env vars are configured
      config.externals.push('langfuse', 'langsmith');
    }
    return config;
  },
};

module.exports = nextConfig;
