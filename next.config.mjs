const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            key: 'Content-Type',
            value: 'application/javascript'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
