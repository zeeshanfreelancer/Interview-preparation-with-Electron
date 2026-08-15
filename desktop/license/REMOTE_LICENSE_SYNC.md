# Remote License Sync

This app can load the latest signed license manifest from a remote URL.

## Setup

1. Open `desktop/license/remote-config.js`.
2. Set `REMOTE_LICENSE_MANIFEST_URL` to your hosted `licenses.manifest.json` URL.
3. Build and release the app once with that URL.
4. After that, update passwords with:

```bash
npm run add-password --prefix desktop -- add --password "NewPass123" --expires "2026-12-31"
```

5. Upload `desktop/license/licenses.manifest.json` to the same remote URL.

Installed apps will fetch the latest manifest on license checks. If the user is offline, the app uses the last valid cached manifest, then the bundled manifest.

## Security

- Keep `desktop/license/private.pem` secret.
- Do not upload `passwords.json`.
- Only upload `licenses.manifest.json`.
- The app verifies the remote manifest with `public.pem` before using it.
