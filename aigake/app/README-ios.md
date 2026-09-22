# GitHubでビルドしてiPhoneで確認する

2026-09-16。iPhone / iOS 16.4以上。画面・町の描画は `../walk/` とThree.js、歩数の読み取りはHealthKit、ホーム画面ウィジェットはSwiftUI / WidgetKitを使う。Macを所有せず、GitHubのmacOS runnerでコンパイルする構成。

## GitHubへ載せるファイル

元のリポジトリではルートの `.github/workflows/komorebi-ios.yml` がこのフォルダーをビルドする。アプリだけのリポジトリを作る場合は、Windowsで次を実行する。

```powershell
cd C:\calude\sleepwork\aigake\app
npm ci
npm run test:walk
npm run sync:ios
npm run verify:ios
npm run export:ios
```

`dist/komorebi-ios/` に必要なソースだけを集める。その**中身をGitHubリポジトリのルート**へ配置する。`.github/` も必要。別の親フォルダーで包まない。証明書・鍵・node_modules・過去の実験ページ・生成済みアプリは入れない。書き出したフォルダーは生成物なので、変更は元のソースに行って再出力する。

2026-09-20：星座観測を含む最新版の書き出しを確認。`package.json` の `test:*` に指定されたテストと依存ソースも自動で収集する。書き出したフォルダーで依存パッケージの新規インストール、歩行・星座32件＋編集17件のテスト、Web同梱、CapacitorのiOS同期、iOS構成検査を通過した。[GitHubの初回ビルド](https://github.com/iyomu146-commits/Dayorama_ios/actions/runs/35511726134)で本体とWidgetのSimulatorコンパイルも成功。実機確認はSideloadlyで進め、TestFlightの署名設定は後回しにする。

```text
リポジトリルート/
  .github/workflows/komorebi-ios.yml
  aigake/
    walk/                       画面、台帳、再生、Widget連携、テスト
    experiments/.../           描画に必要なモデルと景観のソースのみ
    vendor/three/               描画ライブラリーとライセンス
    app/
      package.json / package-lock.json
      capacitor.config.json
      scripts/                 同梱・検証・署名補助・書き出し
      ios/App/
        App.xcodeproj/         AppとKomorebiWidgetの2ターゲット
        App/                   HealthKit、Widget連携プラグイン
        Shared/                共通のWidgetデータ型と保存処理
        KomorebiWidget/        SwiftUIとWidgetKit
        Config/Komorebi.xcconfig
```

この配置なら、追加のWebサーバーや外部のモデルAPIなしでビルドする。`www-walk/` とiOSの `App/public/` はCIが生成する。元の作業リポジトリの旧 `www/` とAndroidは変更せず、書き出し対象から外している。

## 町の音

町の音は同梱したBGM・積み上げ音・完成音と、端末内で合成する短い操作音の4種類。環境音は鳴らさない。音源の外部配信・生成API・録音許可は不要。設定でBGM・建築音・操作音を個別調整し、ヘッダーのスピーカーで消音する。端末時刻の19:00に夜用BGM、07:00に昼用へ約2秒かけて切り替える。デバッグ時刻も景観と音楽に共通。BGMは繰り返し再生し、画面を閉じた後は再生位置を保って再開する。完成音の間はBGMを下げ、シークや既存の町の読み込みでは建築音を鳴らさない。元のWAVと軽量化した配布音源の扱いは `walk/audio/README.md` を参照。

iOSの音声セッションは既存の `.ambient` のまま。実機では消音スイッチ、他アプリの音声との同時再生、画面ロック・通話割り込み後の復帰を確認する。

## 1. まず署名なしでビルドする

GitHubへのpush / Pull Requestではビルドしない。実機確認したいときに Actions → `Komorebi iOS` → `Run workflow` を開き、ブランチを `main`、`testflight` をオフにして手動実行する。Secretsは不要。

テスト → Web同梱 → Capacitor同期 → Xcode / plist / YAML検証 → Swiftの共有データ検証 → 本体とWidgetのSimulatorビルド → iPhone実機用Releaseビルドを行う。Appの中に `PlugIns/KomorebiWidget.appex` が含まれることも確認する。

Artifactsに2種類の成果物が出る。`Komorebi-Simulator` はMacのSimulator専用。**Sideloadlyには `Komorebi-iPhone-Unsigned` を使う。** 失敗時はXcodeの診断結果を保存する。

### SideloadlyでiPhoneへ入れる

1. GitHubのActionsで成功した `Komorebi iOS` を開く。
2. Artifactsの `Komorebi-iPhone-Unsigned` をダウンロードし、外側のZIPを解凍する。
3. 中の `Komorebi-unsigned.ipa` をSideloadlyに渡し、自分の環境で再署名・インストールする。
4. 起動と描画を確認後、歩数連携とWidgetを確認する。

IPAには本体とWidgetが含まれる。CI側にApple ID、配布用証明書、Secretsを登録する必要はない。IPAは未署名であり、そのままiPhoneへコピーするだけでは起動できない。

HealthKitとApp Groupの参照用権限ファイル、SHA-256、簡単な手順も同梱する。権限ファイルは自動適用されるものではない。ヘルスケア連携にはHealthKit、Widget共有には本体・拡張で同じApp Groupが必要。再署名時にBundle IDやApp Groupが変更される場合は、両方の `Info.plist` の `KomorebiAppGroup` と署名の権限も一致させる。Widgetを確認する場合は拡張を削除しない。

HealthKit権限が付かない署名では、アプリの設定から **「iPhoneの歩数を使う」** を選ぶ。HealthKitの署名エラーが出た町の画面にも同じボタンを表示する。Core Motionの `CMPedometer` を使い、OSの「モーションとフィットネス」を別途許可する方式で、HealthKitの権限は使わない。拒否した場合はiPhoneの設定 → プライバシーとセキュリティ → モーションとフィットネスを確認する。

この方式はiPhone本体で計測した歩数のみ。Apple Watchやヘルスケアに追加された他の記録は含まない。OSから新しく読める履歴は直近7日間で、途中からしか取得できない最古の日は除外する。7日を超えてアプリを開かなかった期間の未取得分は復元できないが、取得済みの記録と町は保存する。連携先を変更しても同じ日を二重加算しない。アプリを削除せず上書き更新する。WidgetのApp Group権限は、この歩数方式への切り替えでは解消しない。

Sideloadlyのカスタム権限機能は公式変更履歴でApple Developer Program加入者向け・Patreon機能とされている。利用環境によって歩数やWidgetの確認に追加設定が必要になる。アプリのインストール成功と、これらの動作確認は区別する。[Sideloadly公式](https://sideloadly.io/changelog)

### 歩数操作のデバッグ

サイドロード用IPAは、設定 → デバッグ → **「デバッグを開始」** から歩数を操作できる。町の「歩数を操作」で＋100／1,000／5,000／20,000歩、任意の歩数追加、建築中の1棟を完成、地区を完成、デバッグの町の初期化に対応する。通常の建築演出・完成記録・タイムラプスに反映する。

初回は実際の町のコピーを作り、以降はデバッグ専用の保存データを再開する。設定 → 「デバッグを終了」で実際の町へ戻る。デバッグ中は端末歩数の読み取りとWidgetへの送信を停止し、星座帳も分ける。初期化はデバッグ用の歩数・建築記録だけが対象で、選択地域とseedを保持する。

CIでは `KOMOREBI_DEBUG_TOOLS=1` をサイドロード用ビルドに設定し、TestFlightでは0にする。通常のローカルビルドも既定では無効。ネイティブではURLに `?debug=1` を付けるだけでは有効にならない。ブラウザーではlocalhostの `/walk/?debug=1` で検証できる。

## 2. TestFlightを使う場合：Apple側を設定する

TestFlightを使うため、Apple Developer Programの登録とApp Store Connectの設定が必要。

1. Apple DeveloperのIdentifiersで、App IDを2つ作る。
   - `com.iyomu.dayorama`：HealthKitとApp Groupsを有効化。
   - `com.iyomu.dayorama.widget`：App Groupsを有効化。
2. App Group `group.com.iyomu.dayorama` を作り、両方のApp IDへ割り当てる。
3. Apple Distribution証明書と秘密鍵を含むパスワード付き `.p12` を用意する。
4. App Store Connect配布用プロファイルを**AppとWidgetそれぞれ**発行する。同じ証明書・Teamを使い、上記のApp Groupを含める。App側はHealthKitも含める。Development / Ad Hoc用は使わない。以前のHealthKitのみのプロファイルがある場合は再発行する。
5. App Store Connectに本体のBundle IDでアプリを作る。Widget用の別アプリ登録は不要。アップロード権限のあるAPIキーを用意する。

識別子は `ios/App/Config/Komorebi.xcconfig` にまとめている。本体のBundle IDを変える場合は `capacitor.config.json` の `appId` も揃える。Widget IDとApp Groupは本体IDから導出する。証明書はWindowsでもOpenSSLでCSRと秘密鍵を作成し、Appleで発行した証明書と合わせてp12にできる。

## 3. GitHub Secretsを登録する

リポジトリの Settings → Secrets and variables → Actions に登録する。ファイルや値をコード・Issue・ログへ貼らない。

| Secret | 内容 |
| --- | --- |
| `APPLE_TEAM_ID` | Apple DeveloperのTeam ID |
| `IOS_DISTRIBUTION_P12_BASE64` | 配布証明書と秘密鍵を含むp12のBase64 |
| `IOS_DISTRIBUTION_P12_PASSWORD` | p12のパスワード |
| `IOS_PROFILE_BASE64` | 本体のApp Store配布プロファイル。HealthKit + App Group |
| `IOS_WIDGET_PROFILE_BASE64` | WidgetのApp Store配布プロファイル。同じApp Group |
| `ASC_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | API Issuer ID |
| `ASC_KEY_BASE64` | APIキーp8のBase64 |

Base64は暗号化ではない。エディターやターミナルへ出力せず、手元のファイルからSecrets欄にだけ渡す。配布プロファイルのApp ID、Team、App Group、有効期限、配布方式はCIが検証する。

## 4. TestFlightで実機確認する

1. Actions → Komorebi iOS → Run workflow → `testflight` をオン。
2. 本体とWidgetを異なるプロファイルで署名し、1つのIPAへまとめてApp Store Connectにアップロードする。App Storeへの公開・審査提出は行わない。
3. Apple側の処理後、内部テスターにビルドを割り当て、iPhoneのTestFlightでインストールする。契約・輸出コンプライアンス等の確認が表示された場合は所有者が回答する。
4. アプリを一度開き、歩数を連携する。
5. iPhoneのホーム画面でウィジェットを追加し、「こもれび」の小または中サイズを選ぶ。

Widgetが空欄の場合は、アプリを開いて同期する。初回起動前はWidget一覧に出ないことがある。追加後は、歩いてからアプリを開いて同期し、Widgetの画像・歩数・残り歩数が更新されること、タップで町へ戻ることを確認する。

## ウィジェットの動作

- 小：建築中の建物の画像、工程の進捗、完成までの歩数、同期時刻。
- 中：町の画像、今日の歩数、建築中の建物、残り歩数、同期時刻。
- 実測歩数と確定した建築状態を使う。プレビューやタイムラプスの一時的な状態は共有しない。
- App Group内の1つのJSONに小さなPNGと数値をまとめてatomic保存する。外部へ送信しない。
- 日付・タイムゾーンが変わって未同期の場合、今日の歩数を `—` にする。未取得を0歩にしない。
- 更新はアプリ起動・歩数同期・地域変更などに連動する。**閉じたまま歩いた結果の即時更新は未対応**。Widget側は同期時点の町を表示し、OSが更新タイミングを管理する。

詳細は [WIDGET-PLAN.md](WIDGET-PLAN.md)。Windowsでの画像確認は元の作業環境の `/walk/dev/widget-preview.html`。これはSwiftUIそのものの実機プレビューではない。

## 検証状況と残る確認

Windowsで、歩行・星座・歩数連携・デバッグ52件、編集17件、署名プロファイル検証、Xcodeターゲットの接続、共有ファイルと各ターゲットの署名設定、plist・YAML構文、Webの同梱、Capacitor同期、Widget用PNGと表示復帰を確認している。

2026-09-20：歩数連携ボタンが応答しない問題を修正。CapacitorのプラグインProxyをasync関数から返すと、Promiseが存在しない `Health.then()` を呼び出して待ち続けていた。初期化とネイティブ呼び出しを分け、実際のCapacitor Proxyを使う回帰テストを追加した。連携中はボタンに状態を表示し、失敗理由は画面に残す。HealthKitの許可画面はメインスレッドから開く。署名後の権限と実機の許可操作は別途確認が必要。

**GitHubで本体とWidgetのSimulatorコンパイルは成功。** iPhone実機用IPAのビルド結果は各Actions実行の `Build unsigned iPhone app and widget` を確認する。Sideloadlyでの再署名・インストール、iPhoneのWidget表示とHealthKit、TestFlight配信は実機・アカウント側の確認が必要。

実機では、歩数許可／拒否、深夜またぎ、Widget追加直後、ロック／再起動後、低電力、サイズ変更、タップでの復帰、前回同期の表示、同期中断を確認する。健康データの読み取り拒否はHealthKitから判別できないため、空の応答を許可済みや0歩として扱わない。

## 公式資料

- [Core Motionの歩数計と利用許可](https://developer.apple.com/documentation/coremotion/cmpedometer)
- [取得可能な履歴は直近7日間](https://developer.apple.com/documentation/coremotion/cmpedometer/querypedometerdata(from:to:withhandler:))
- [CapacitorのiOS対応とXcode要件](https://capacitorjs.com/docs/ios)
- [Widget Extension](https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension)
- [App GroupsとWidgetKitの構成](https://developer.apple.com/documentation/WidgetKit/Developing-a-WidgetKit-strategy)
- [Widgetの更新タイミング](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- [GitHub ActionsのiOS署名](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)
