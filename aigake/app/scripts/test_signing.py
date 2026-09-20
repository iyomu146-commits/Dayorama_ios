import copy
import datetime
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('signing', pathlib.Path(__file__).with_name('prepare-signing.py'))
signing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)


class Profiles(unittest.TestCase):
    def setUp(self):
        self.profile = {'TeamIdentifier': ['TEAM'], 'UUID': '12345678-1234-1234-1234-123456789012',
                        'ExpirationDate': datetime.datetime.now() + datetime.timedelta(days=10),
                        'Entitlements': {'application-identifier': 'TEAM.com.test.app', 'com.apple.security.application-groups': ['group.com.test.app'], 'com.apple.developer.healthkit': True}}

    def check(self, p):
        return signing.validate_profile(p, 'com.test.app', 'TEAM', 'group.com.test.app', True)

    def test_valid_distribution(self):
        self.assertEqual(self.check(self.profile), self.profile['UUID'])

    def test_wrong_or_incomplete_profiles(self):
        for key, value in [('application-identifier', 'TEAM.com.test.app.widget'), ('com.apple.security.application-groups', []), ('com.apple.developer.healthkit', False), ('get-task-allow', True)]:
            p = copy.deepcopy(self.profile)
            p['Entitlements'][key] = value
            with self.subTest(key=key), self.assertRaises(AssertionError):
                self.check(p)

    def test_expired_and_ad_hoc_profiles(self):
        for key, value in [('ExpirationDate', datetime.datetime.now() - datetime.timedelta(days=1)), ('ProvisionedDevices', ['device']), ('ProvisionsAllDevices', True), ('TeamIdentifier', ['OTHER'])]:
            p = copy.deepcopy(self.profile)
            p[key] = value
            with self.subTest(key=key), self.assertRaises(AssertionError):
                self.check(p)


if __name__ == '__main__':
    unittest.main()
