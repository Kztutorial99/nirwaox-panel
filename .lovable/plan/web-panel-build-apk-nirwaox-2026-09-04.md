# Web Panel Build APK NirwaOX

Panel web di proyek Lovable ini akan memicu build APK di repo `Kztutorial99/NirwaOX` lewat GitHub Actions. User memasukkan **Bot Token** & **Chat ID** di panel; nilai dikirim sekali pakai sebagai inputs ke workflow, diinject ke `BuildConfig`, lalu APK diupload sebagai release yang bisa didownload dari panel.

## Perubahan di repo NirwaOX (via GitHub API)

1. **`.github/workflows/android-build.yml`** — hanya `workflow_dispatch` dengan `inputs.bot_token` & `inputs.chat_id`. Nilai diset sebagai env `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` saat gradle build. Setiap run bikin GitHub Release baru dengan tag `panel-<run_number>` berisi APK debug + release.
2. **`app/src/main/res/layout/activity_main.xml`** — hapus field input token, chat ID, dan tampilan/tombol Device ID. Sisakan: status, tombol izin notifikasi, tombol start service, tombol test kirim.
3. **`MainActivity.kt`** — hapus semua referensi `etToken`, `etChatId`, `btnSave`, `tvDeviceId`, `btnCopy`. Token & chat ID selalu dari `BuildConfig`.
4. **`Prefs.kt`** — `botToken()`/`chatId()` return langsung `BuildConfig.*`. Hapus `deviceId()`, `generateDeviceId()`, `setCredentials()`, `KEY_DEVICE_ID`, `KEY_BOT_TOKEN`, `KEY_CHAT_ID`.
5. **`Telegram.kt`** — ganti pesan yang mereferensi "form konfigurasi" jadi "build ulang APK dari panel".

## Panel (proyek Lovable ini)

- Rewrite `src/routes/index.tsx` sebagai halaman **NirwaOX Build Panel**: form dengan input Bot Token, Chat ID, tombol "Build APK", dan daftar 5 run terakhir (status + tombol download bila ada release).
- Server functions di `src/lib/build.functions.ts`:
  - `triggerBuild({ botToken, chatId })` → `POST /repos/Kztutorial99/NirwaOX/actions/workflows/android-build.yml/dispatches` pakai `GITHUB_TOKEN`.
  - `listRuns()` → `GET .../actions/runs?per_page=5` + `GET /releases/tags/panel-<run_number>` untuk URL APK.
- UI polling tiap 5 detik selama ada run in-progress.
- Peringatan di UI: workflow inputs terlihat di log GitHub Actions repo — pastikan repo private atau siap dengan risiko itu.

## Deploy Vercel

- Tambah `vercel.json` minimal (framework Vite, output `dist/`) supaya import di dashboard Vercel langsung jalan.
- Tidak menyimpan `VERCEL_TOKEN` (user deploy manual dari dashboard Vercel).
- **Penting:** Di Vercel Project Settings → Environment Variables, user harus set `GITHUB_TOKEN` sendiri (secret Lovable tidak ikut kebawa ke Vercel).

## Yang TIDAK dibuat

- Tidak ada login/auth di panel — siapapun yang buka URL bisa memicu build. Kalau butuh proteksi, tambah nanti (Lovable Cloud auth atau password sederhana).
- Tidak ada penyimpanan token di database.
