# WidgetKit実装

2026-09-16。SwiftUI / WidgetKit Extensionを追加済み。Windowsで静的構成・Web連携を検証し、ネイティブコンパイルと実機表示はGitHub / iPhoneで確認する。

## 構成

`walk/widget.mjs` が確定台帳から今日の歩数・施工進捗・残り歩数を作る。`town-world.mjs` が全景と建物のPNGを最大512pxで生成し、撮影前の表示とカメラを復元する。起動時の演出中でも確定した進捗を使い、タイムラプス中は撮影しない。

`WidgetBridgePlugin.swift` がペイロードと画像の形式・サイズを検証する。App Groupの `widget-snapshot-v1.json` に画像と数値を1つの組としてatomic保存し、`WidgetCenter.reloadTimelines` を呼ぶ。ネイティブのデータ型と保存処理は `Shared/WidgetSnapshot.swift` を両ターゲットへコンパイルする。

`KomorebiWidget.swift` は小・中サイズを表示する。未同期・初回はアプリへの導線、過去の日付や異なるタイムゾーンは今日の歩数をダッシュで表示する。翌日0時のtimeline entryも用意し、前日の歩数を持ち越して見せない。共有ファイルは初回アンロックまで保護し、Widgetの表示は `privacySensitive` とする。

タップ先は `komorebi://town`。コールド起動では既定の町画面、起動済みなら通知をWebへ渡して再生画面などを閉じ、町へ移動する。

## 更新と制限

アプリで歩数を同期した時点のデータを表示する。バックグラウンドのHealthKit監視やWidget自身からの歩数読み取りは導入していない。アプリを閉じたままの更新は次の段階。同期時刻と日付を表示して、最新だと誤認させない。OS側の更新予算があるため、更新要求とホーム画面への反映時刻は一致しないことがある。

## ビルド

App → KomorebiWidgetの依存関係とEmbed App Extensionsフェーズを設定する。App Groupは共通のxcconfigから展開し、両方のentitlementsとInfo.plistで一致させる。TestFlight用プロファイルは各ターゲット専用の設定変数で指定する。手順・Secretsは [README-ios.md](README-ios.md)。
