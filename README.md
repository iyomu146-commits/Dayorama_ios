# こもれび — iPhone / WidgetKit

このフォルダーの内容をGitHubリポジトリのルートに配置してください。`.github` も含めます。

- push / Pull Request：アプリとウィジェットの署名なしビルド。
- Actions → Komorebi iOS → Run workflow：`testflight` をオンにすると署名・TestFlightアップロード。
- iPhone実機にはApple Developerの設定と署名が必要です。Simulator成果物はiPhoneには入りません。

[Apple側の設定、必要なSecrets、実機確認手順](aigake/app/README-ios.md)

Windows：`cd aigake/app` → `npm ci` → `npm run test:walk` → `npm run sync:ios` → `npm run verify:ios`。

生成物と証明書は含みません。元の作業環境で更新したら `npm run export:ios` で再作成します。
