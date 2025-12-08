/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Ativado para build estático para Firebase Hosting
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
