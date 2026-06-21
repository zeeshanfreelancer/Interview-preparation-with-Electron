Push update to github release

git tag v1.0.0
git push origin v1.0.0


First time only — generate signing keys:

cd desktop
npm run add-password -- init

Add a password for a user:
npm run add-password -- add --password "UserPass123" --expires "2026-12-31" --label "John"

List passwords:
npm run add-password -- list

Remove a password:
npm run add-password -- remove --password "UserPass123"