# Remote License Sync

This app can load the latest signed license manifest from GitHub or any public HTTPS URL.

After users install one app version that contains the remote URL, future password changes do not require rebuilding the app. You only need to upload the updated `licenses.manifest.json` file to the same URL.

## Setup

1. Upload this file to GitHub:

```text
desktop/license/licenses.manifest.json
```

2. Do not upload these files:

```text
desktop/license/private.pem
desktop/license/passwords.json
```

3. Open `licenses.manifest.json` on GitHub and click **Raw**.

4. Copy the raw URL. It should look like this:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/desktop/license/licenses.manifest.json
```

5. Open `desktop/license/remote-config.js`.

6. Set `REMOTE_LICENSE_MANIFEST_URL` to that GitHub raw URL:

```js
const REMOTE_LICENSE_MANIFEST_URL =
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/desktop/license/licenses.manifest.json";
```

7. Build and release the app once.

Users must install this updated app version one time. After that, installed apps can automatically fetch future password updates from GitHub.

## Updating Passwords Later

Add or update a password:

```bash
npm run add-password --prefix desktop -- add --password "NewPass123" --expires "2026-12-31"
```

Then upload the updated file to GitHub:

```text
desktop/license/licenses.manifest.json
```

Installed apps will fetch the latest manifest on license checks. If the user is offline, the app uses the last valid cached manifest first, then the bundled manifest.

## How It Works

1. The app downloads the remote `licenses.manifest.json`.
2. The app verifies its signature using `public.pem`.
3. If the signature is valid, the app uses the remote license list.
4. If remote download fails, the app uses the cached valid manifest.
5. If no cache exists, the app uses the manifest bundled with the installer.

The Settings modal can show the remaining license time because the active license stores `expiresAt`.

## Security

- Keep `desktop/license/private.pem` secret.
- Do not upload `passwords.json`.
- Only upload `licenses.manifest.json`.
- The app verifies the remote manifest with `public.pem` before using it.
- If your GitHub repo is public, people can see license hashes and expiry dates, but not plain passwords.
