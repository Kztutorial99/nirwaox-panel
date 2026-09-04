import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { triggerBuild, listRuns, type BuildRun } from "@/lib/build.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NirwaOX Build Panel — Build APK dengan Bot Token" },
      {
        name: "description",
        content:
          "Panel web untuk build APK NirwaOX. Masukkan Telegram bot token dan chat ID, panel memicu GitHub Actions dan menyediakan APK siap install.",
      },
      { property: "og:title", content: "NirwaOX Build Panel" },
      {
        property: "og:description",
        content: "Build APK NirwaOX langsung dari panel web dengan bot token dan chat ID.",
      },
    ],
  }),
  component: Panel,
});

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadge(run: BuildRun) {
  if (run.status !== "completed") {
    return <Badge variant="secondary">{run.status.replace("_", " ")}</Badge>;
  }
  if (run.conclusion === "success") return <Badge className="bg-emerald-600">success</Badge>;
  if (run.conclusion === "failure") return <Badge variant="destructive">failure</Badge>;
  return <Badge variant="outline">{run.conclusion ?? "unknown"}</Badge>;
}

function Panel() {
  const router = useRouter();
  const trigger = useServerFn(triggerBuild);
  const list = useServerFn(listRuns);

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const runsQuery = useQuery({
    queryKey: ["nirwaox-runs"],
    queryFn: () => list(),
    refetchInterval: (q) => {
      const runs = q.state.data?.runs ?? [];
      const active = runs.some((r) => r.status !== "completed");
      return active ? 5000 : 15000;
    },
  });

  const runs = runsQuery.data?.runs ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!botToken.trim() || !chatId.trim()) return;
    setSubmitting(true);
    try {
      await trigger({ data: { botToken, chatId } });
      toast.success("Build dimicu. GitHub Actions akan segera mulai.");
      setBotToken("");
      setChatId("");
      setTimeout(() => runsQuery.refetch(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memicu build");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">NirwaOX Build Panel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Isi bot token & chat ID, panel akan memicu GitHub Actions di repo{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Kztutorial99/NirwaOX</code>{" "}
            dan menampilkan APK ketika build selesai.
          </p>
        </header>

        <Alert className="mb-6">
          <AlertTitle>Perhatian keamanan</AlertTitle>
          <AlertDescription>
            Nilai bot token & chat ID dikirim sebagai inputs workflow dan bisa terlihat di log
            GitHub Actions repo. Pastikan repo bersifat privat atau siap dengan risiko itu.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Build APK baru</CardTitle>
            <CardDescription>Nilai dipakai sekali untuk build ini saja.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot">Telegram Bot Token</Label>
                <Input
                  id="bot"
                  type="password"
                  autoComplete="off"
                  placeholder="123456:ABC-DEF..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat">Chat ID</Label>
                <Input
                  id="chat"
                  type="text"
                  autoComplete="off"
                  placeholder="-1001234567890"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Memicu build…" : "Build APK"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Build terakhir</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                runsQuery.refetch();
                router.invalidate();
              }}
            >
              Refresh
            </Button>
          </div>

          {runsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : runsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Gagal memuat</AlertTitle>
              <AlertDescription>
                {runsQuery.error instanceof Error ? runsQuery.error.message : "Unknown error"}
              </AlertDescription>
            </Alert>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada build.</p>
          ) : (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li
                  key={run.id}
                  className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Build #{run.runNumber}</span>
                        {statusBadge(run)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Log
                    </a>
                  </div>
                  {run.apkAssets.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {run.apkAssets.map((a) => (
                        <a
                          key={a.name}
                          href={a.url}
                          className="flex items-center justify-between rounded border bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
                        >
                          <span className="truncate">{a.name}</span>
                          <span className="ml-3 text-xs text-muted-foreground">
                            {fmtBytes(a.size)}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                  {run.status === "completed" &&
                    run.conclusion === "success" &&
                    run.apkAssets.length === 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Release belum tersedia. Coba refresh sebentar lagi.
                      </p>
                    )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Deploy: import repo ini ke Vercel dan set env{" "}
          <code className="rounded bg-muted px-1 py-0.5">GITHUB_TOKEN</code> di project settings.
        </footer>
      </div>
    </div>
  );
}
