// PM2 process config for the Next.js frontend.
//
// Usage (from apps/web, after `npm ci` and `npm run build` have been run):
//   pm2 start ecosystem.config.cjs
//   pm2 save              # persist the process list
//   pm2 startup           # print the systemd command to auto-start PM2 on boot
//
// This app is a single Node process (no cluster mode) - `next start` already
// handles concurrent requests fine for this app's scale, and PM2's cluster
// mode complicates the in-memory access-token pattern used nowhere server-side
// here anyway (auth state lives in the browser/cookie, not in-process), so
// there's no real benefit to running multiple instances behind PM2 itself.
// Scale by giving the box more resources or adding a second EC2 instance
// behind a load balancer later, not by PM2 clustering a single box.
module.exports = {
  apps: [
    {
      name: "therapist-web",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // API_BASE_URL is NOT set here on purpose: put it in
        // apps/web/.env.production.local (gitignored) instead, which Next.js
        // loads automatically for both `next build` and `next start` - no
        // need to duplicate it into PM2's own env block. It is intentionally
        // NOT NEXT_PUBLIC_*, so it must never appear in the client bundle.
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "500M",
    },
  ],
};
