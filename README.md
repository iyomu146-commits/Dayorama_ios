# こもれび — iPhone / WidgetKit

このフォルダーの内容をGitHubリポジトリのルートに配置してください。`.github` も含めます。

- push / Pull Request：アプリとウィジェットの署名なしビルド。
- Sideloadly：ActionsのArtifactsから `Komorebi-iPhone-Unsigned` を取得し、解凍して `Komorebi-unsigned.ipa` を渡します。CIのSecretsは不要です。
- `Komorebi-Simulator` はMacのSimulator専用で、iPhoneには入りません。
- TestFlightを使う場合は署名設定後に Run workflow の `testflight` をオンにします。

[実機確認手順・歩数とWidgetの権限・TestFlight設定](aigake/app/README-ios.md)

Windows：`cd aigake/app` → `npm ci` → `npm run test:walk` → `npm run sync:ios` → `npm run verify:ios`。

生成物と証明書は含みません。元の作業環境で更新したら `npm run export:ios` で再作成します。
