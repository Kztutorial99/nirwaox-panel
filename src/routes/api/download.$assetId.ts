import { createFileRoute } from "@tanstack/react-router";

const REPO = "Kztutorial99/NirwaOX";

export const Route = createFileRoute("/api/download/$assetId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = process.env["GITHUB_TOKEN"];
        if (!token) return new Response("GITHUB_TOKEN belum diset", { status: 500 });

        const assetId = params.assetId;
        if (!/^\d+$/.test(assetId)) return new Response("Asset tidak valid", { status: 400 });

        const url = new URL(request.url);
        const rawName = url.searchParams.get("name") ?? `nirwaox-${assetId}.apk`;
        const fileName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");

        const upstream = await fetch(
          `https://api.github.com/repos/${REPO}/releases/assets/${assetId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/octet-stream",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "nirwaox-panel",
            },
            redirect: "follow",
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(`Gagal mengambil APK [${upstream.status}]: ${text}`, {
            status: upstream.status === 404 ? 404 : 502,
          });
        }

        const headers = new Headers({
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        });
        const len = upstream.headers.get("content-length");
        if (len) headers.set("Content-Length", len);

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
