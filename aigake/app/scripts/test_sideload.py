import importlib.util
import pathlib
import plistlib
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('package_sideload', pathlib.Path(__file__).with_name('package-sideload.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SideloadPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.app = self.root / 'App.app'
        self.widget = self.app / 'PlugIns' / 'KomorebiWidget.appex'
        for bundle, identifier in [(self.app, 'com.example.town'), (self.widget, 'com.example.town.widget')]:
            bundle.mkdir(parents=True, exist_ok=True)
            info = {'CFBundleSupportedPlatforms': ['iPhoneOS'], 'CFBundleExecutable': 'Executable', 'CFBundleIdentifier': identifier, 'KomorebiAppGroup': 'group.com.example.town'}
            if bundle == self.widget:
                info['NSExtension'] = {'NSExtensionPointIdentifier': 'com.apple.widgetkit-extension'}
            (bundle / 'Info.plist').write_bytes(plistlib.dumps(info))
            (bundle / 'Executable').write_bytes(b'packaging test fixture')
            (bundle / 'Executable').chmod(0o755)
        (self.app / 'public').mkdir()
        (self.app / 'public' / 'index.html').write_text('walking app', encoding='utf-8')

    def change(self, bundle, key, value):
        file = bundle / 'Info.plist'
        info = plistlib.loads(file.read_bytes())
        info[key] = value
        file.write_bytes(plistlib.dumps(info))

    def test_ipa_has_payload_widget_and_resolved_entitlements(self):
        output = self.root / 'output'
        ipa = module.package(self.app, output)
        with zipfile.ZipFile(ipa) as archive:
            self.assertIn('Payload/App.app/PlugIns/KomorebiWidget.appex/Executable', archive.namelist())
            self.assertEqual(archive.read('Payload/App.app/public/index.html'), b'walking app')
        entitlements = plistlib.loads((output / 'App.entitlements').read_bytes())
        self.assertTrue(entitlements['com.apple.developer.healthkit'])
        self.assertEqual(entitlements['com.apple.security.application-groups'], ['group.com.example.town'])

    def test_rejects_simulator_in_either_target(self):
        for bundle in [self.app, self.widget]:
            with self.subTest(bundle=bundle.name):
                self.change(bundle, 'CFBundleSupportedPlatforms', ['iPhoneSimulator'])
                with self.assertRaisesRegex(ValueError, 'iPhone device'):
                    module.package(self.app, self.root / 'bad')
                self.change(bundle, 'CFBundleSupportedPlatforms', ['iPhoneOS'])

    def test_rejects_missing_app_and_mismatched_widget_group(self):
        self.change(self.widget, 'KomorebiAppGroup', 'group.other')
        with self.assertRaisesRegex(ValueError, 'App Group'):
            module.package(self.app, self.root / 'bad')
        self.change(self.widget, 'KomorebiAppGroup', 'group.com.example.town')
        (self.app / 'public' / 'index.html').unlink()
        with self.assertRaisesRegex(ValueError, 'bundled walking app'):
            module.package(self.app, self.root / 'bad')


if __name__ == '__main__':
    unittest.main()
