"""Validate both profiles, install them, and emit target-specific CI settings."""
import datetime
import os
import pathlib
import plistlib
import re
import shutil


def validate_profile(profile, bundle, team, group, health=False):
    ent = profile['Entitlements']
    assert profile.get('TeamIdentifier') == [team], 'Wrong profile team'
    assert ent.get('application-identifier', '').split('.', 1)[-1] == bundle, 'Wrong profile App ID'
    assert group in ent.get('com.apple.security.application-groups', []), 'Profile needs the shared App Group'
    assert not ent.get('get-task-allow', False), 'Use an App Store distribution profile'
    assert not profile.get('ProvisionedDevices') and not profile.get('ProvisionsAllDevices'), 'Use App Store profiles, not Development, Ad Hoc or enterprise profiles'
    assert profile['ExpirationDate'].replace(tzinfo=datetime.timezone.utc) > datetime.datetime.now(datetime.timezone.utc), 'Profile expired'
    assert re.fullmatch(r'[0-9a-fA-F-]{36}', profile['UUID']), 'Invalid profile UUID'
    if health:
        assert ent.get('com.apple.developer.healthkit') is True, 'App profile needs HealthKit'
    return profile['UUID']


def main():
    temp = pathlib.Path(os.environ['RUNNER_TEMP'])
    team = os.environ['APPLE_TEAM_ID']
    config = pathlib.Path('ios/App/Config/Komorebi.xcconfig').read_text()
    app_id = re.search(r'^KOMOREBI_APP_ID\s*=\s*(\S+)', config, re.M)[1]
    resolve = lambda key: re.search(r'^'+key+r'\s*=\s*(\S+)', config, re.M)[1].replace('$(KOMOREBI_APP_ID)', app_id)
    widget_id, group = resolve('KOMOREBI_WIDGET_ID'), resolve('KOMOREBI_APP_GROUP')
    profiles = {}
    for name, bundle, health in [('app', app_id, True), ('widget', widget_id, False)]:
        with (temp / (name+'-profile.plist')).open('rb') as f:
            profile = plistlib.load(f)
        profiles[name] = validate_profile(profile, bundle, team, group, health)
    destination = pathlib.Path.home() / 'Library/MobileDevice/Provisioning Profiles'
    destination.mkdir(parents=True, exist_ok=True)
    with open(os.environ['GITHUB_ENV'], 'a') as env:
        env.write('APPLE_TEAM_ID='+team+'\n')
        for name, uuid in profiles.items():
            shutil.copyfile(temp / (name+'.mobileprovision'), destination / (uuid+'.mobileprovision'))
            env.write(name.upper()+'_PROFILE_UUID='+uuid+'\n')
    options = {'method': 'app-store-connect', 'signingStyle': 'manual', 'teamID': team,
               'provisioningProfiles': {app_id: profiles['app'], widget_id: profiles['widget']},
               'uploadSymbols': True, 'manageAppVersionAndBuildNumber': False}
    with (temp / 'ExportOptions.plist').open('wb') as f:
        plistlib.dump(options, f)


if __name__ == '__main__':
    main()
