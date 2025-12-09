/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' apenas quando BUILD_STATIC=true (para Firebase Hosting)
  // Em desenvolvimento, não usar output: 'export' para evitar problemas com hot reload
  ...(process.env.BUILD_STATIC === 'true' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // experimental: {
  //   appDir: true, // Removido - não é mais necessário no Next.js 14
  // },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorar warnings durante o build para permitir deploy
  },
  // Headers para evitar cache durante desenvolvimento
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
