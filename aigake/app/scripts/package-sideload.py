"""Package a device build for user-controlled re-signing; never sign or provision."""
import argparse
import hashlib
import os
import pathlib
import plistlib
import stat
import zipfile


def read_bundle(bundle):
    with (bundle / 'Info.plist').open('rb') as handle:
        info = plistlib.load(handle)
    if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']:
        raise ValueError(f'Expected an iPhone device build: {bundle.name}')
    executable = info.get('CFBundleExecutable', '')
    if not executable or pathlib.Path(executable).name != executable or not (bundle / executable).is_file():
        raise ValueError(f'Missing bundle executable: {bundle.name}')
    return info


def package(app, output):
    app, output = pathlib.Path(app).resolve(), pathlib.Path(output).resolve()
    if app.suffix != '.app' or output == app or app in output.parents:
        raise ValueError('Provide an .app and a separate output directory')
    main = read_bundle(app)
    widget_path = app / 'PlugIns' / 'KomorebiWidget.appex'
    widget = read_bundle(widget_path)
    group = main.get('KomorebiAppGroup', '')
    if not group.startswith('group.') or '$(' in group or widget.get('KomorebiAppGroup') != group:
        raise ValueError('App and widget must have the same resolved App Group')
    if widget.get('CFBundleIdentifier') != main.get('CFBundleIdentifier', '') + '.widget':
        raise ValueError('Unexpected widget bundle identifier')
    if widget.get('NSExtension', {}).get('NSExtensionPointIdentifier') != 'com.apple.widgetkit-extension':
        raise ValueError('Missing WidgetKit extension')
    if not (app / 'public' / 'index.html').is_file():
        raise ValueError('Missing bundled walking app')
    output.mkdir(parents=True, exist_ok=True)
    ipa = output / 'Komorebi-unsigned.ipa'
    with zipfile.ZipFile(ipa, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(app.rglob('*')):
            if file.is_dir() and not file.is_symlink():
                continue
            relative = file.relative_to(app)
            name = 'Payload/App.app/' + relative.as_posix()
            if file.is_symlink():
                # Preserve framework links and executable file modes in the IPA.
                file.resolve().relative_to(app)
                entry = zipfile.ZipInfo(name)
                entry.create_system = 3
                entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                archive.writestr(entry, os.readlink(file))
            else:
                archive.write(file, name)
    with zipfile.ZipFile(ipa) as archive:
        if archive.testzip() is not None:
            raise ValueError('IPA archive verification failed')
    shared = {'com.apple.security.application-groups': [group]}
    for filename, entitlements in [('App.entitlements', {**shared, 'com.apple.developer.healthkit': True}), ('Widget.entitlements', shared)]:
        with (output / filename).open('wb') as handle:
            plistlib.dump(entitlements, handle)
    (output / 'SHA256SUMS.txt').write_text(hashlib.sha256(ipa.read_bytes()).hexdigest() + '  ' + ipa.name + '\n', encoding='utf-8')
    (output / 'README-Sideloadly.txt').write_text(
        'こもれび / Sideloadly用 iPhone実機ビルド\n\n'
        '1. GitHubのArtifactsからダウンロードしたZIPを解凍します。\n'
        '2. Komorebi-unsigned.ipaをSideloadlyに渡し、ご自身の環境で再署名・インストールします。\n'
        '3. 起動後に歩数連携を許可し、実歩数と建築の同期を確認します。\n\n'
        'HealthKit権限が不足する場合は、アプリの設定で「iPhoneの歩数を使う」を選び、モーションとフィットネスを許可してください。\n'
        'iPhone本体の歩数のみを読みます。Apple Watchは含まず、新しく取得できる履歴は直近7日間です。取得済みの記録は保存します。\n'
        '更新時はアプリを削除せず、同じBundle IDで上書きしてください。\n\n'
        'このIPAにはiPhone実機用アプリとWidgetが含まれています。配布用署名・証明書・プロファイルは含めていません。\n'
        'HealthKitにはcom.apple.developer.healthkit、Widget共有にはApp Groupsの権限が必要です。\n'
        'App.entitlementsとWidget.entitlementsは再署名時の参照用で、自動的に適用されるものではありません。\n'
        '本体とWidgetを同じApp Groupで署名し、Widget拡張を保持してください。\n'
        'Bundle IDやApp Groupが変更された場合、両方のInfo.plist内KomorebiAppGroupと署名の権限も一致させる必要があります。\n'
        'サイドロードの成功だけでは歩数連携・Widgetの動作確認は完了しません。実機で確認してください。\n\n'
        '本体: ' + main['CFBundleIdentifier'] + '\nWidget: ' + widget['CFBundleIdentifier'] + '\nApp Group: ' + group + '\n'
        'Sideloadlyのカスタム権限機能の利用条件: https://sideloadly.io/changelog\n', encoding='utf-8')
    print(f'Device IPA verified: {ipa.name} ({ipa.stat().st_size:,} bytes), app + WidgetKit extension')
    return ipa


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    package(args.app, args.output)
