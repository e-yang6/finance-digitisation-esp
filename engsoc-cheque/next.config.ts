import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg', 'bcryptjs', '@aws-sdk/client-textract', 'nodemailer'],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
