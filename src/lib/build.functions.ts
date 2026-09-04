import { createServerFn } from "@tanstack/react-start";

const REPO = "Kztutorial99/NirwaOX";
const WORKFLOW = "android-build.yml";

function ghHeaders() {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) throw new Error("GITHUB_TOKEN belum diset di environment");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NirwaOX-Build-Panel",
  };
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { ...ghHeaders(), ...(init?.headers ?? {}) },
  });
  return res;
}

export const triggerBuild = createServerFn({ method: "POST" })
  .inputValidator((data: { botToken: string; chatId: string }) => {
    if (!data?.botToken?.trim()) throw new Error("Bot token wajib diisi");
    if (!data?.chatId?.trim()) throw new Error("Chat ID wajib diisi");
    return { botToken: data.botToken.trim(), chatId: data.chatId.trim() };
  })
  .handler(async ({ data }) => {
    const res = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: "main",
        inputs: { bot_token: data.botToken, chat_id: data.chatId },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${res.status}: ${text}`);
    }
    return { ok: true, dispatchedAt: new Date().toISOString() };
  });

export type BuildRun = {
  id: number;
  runNumber: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
  releaseUrl: string | null;
  apkAssets: { name: string; url: string; size: number }[];
};

export const listRuns = createServerFn({ method: "GET" }).handler(async () => {
  const res = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=5`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    workflow_runs: Array<{
      id: number;
      run_number: number;
      status: string;
      conclusion: string | null;
      created_at: string;
      html_url: string;
    }>;
  };

  const runs: BuildRun[] = await Promise.all(
    json.workflow_runs.map(async (r) => {
      let releaseUrl: string | null = null;
      let apkAssets: BuildRun["apkAssets"] = [];
      if (r.conclusion === "success") {
        const rel = await gh(`/releases/tags/panel-${r.run_number}`);
        if (rel.ok) {
          const relJson = (await rel.json()) as {
            html_url: string;
            assets: { name: string; browser_download_url: string; size: number }[];
          };
          releaseUrl = relJson.html_url;
          apkAssets = relJson.assets
            .filter((a) => a.name.endsWith(".apk"))
            .map((a) => ({
              name: a.name,
              url: a.browser_download_url,
              size: a.size,
            }));
        }
      }
      return {
        id: r.id,
        runNumber: r.run_number,
        status: r.status,
        conclusion: r.conclusion,
        createdAt: r.created_at,
        htmlUrl: r.html_url,
        releaseUrl,
        apkAssets,
      };
    }),
  );

  return { runs };
});
