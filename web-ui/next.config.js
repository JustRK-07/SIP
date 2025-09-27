/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,

	/**
	 * If you are using `appDir` then you must comment the below `i18n` config out.
	 *
	 * @see https://github.com/vercel/next.js/issues/41980
	 */
	// i18n: {
	// 	locales: ["en"],
	// 	defaultLocale: "en",
	// },

	// Add security headers
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Content-Security-Policy",
						value: "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none';"
					},
					{
						key: "X-Frame-Options",
						value: "DENY"
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff"
					}
				]
			}
		];
	}
};

export default config;
