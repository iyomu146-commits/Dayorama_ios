#import <UIKit/UIKit.h>
#import <mach/mach.h>

// Diagnostic sampler only. Rendering and benchmark timing stay in GDScript.
static void BenchWriteSample(void) {
    UIDevice *device=UIDevice.currentDevice;
    device.batteryMonitoringEnabled=YES;
    task_vm_info_data_t vm={0};
    mach_msg_type_number_t count=TASK_VM_INFO_COUNT;
    kern_return_t result=task_info(mach_task_self(),TASK_VM_INFO,(task_info_t)&vm,&count);
    id battery=device.batteryLevel<0 ? (id)NSNull.null : @(round(device.batteryLevel*100));
    id plugged=device.batteryState==UIDeviceBatteryStateUnknown ? (id)NSNull.null : @(device.batteryState!=UIDeviceBatteryStateUnplugged);
    NSDictionary *row=@{@"unixTime":@(NSDate.date.timeIntervalSince1970),
        @"appPhysFootprintBytes":result==KERN_SUCCESS ? (id)@(vm.phys_footprint) : (id)NSNull.null,
        @"batteryPercent":battery,@"plugged":plugged,
        @"thermalState":@(NSProcessInfo.processInfo.thermalState),
        @"lowPowerMode":@(NSProcessInfo.processInfo.lowPowerModeEnabled),
        @"brightness":@(UIScreen.mainScreen.brightness),
        @"maximumFramesPerSecond":@(UIScreen.mainScreen.maximumFramesPerSecond),
        @"source":@"iOS task_vm_info app-only; periodic sample <= 30s old"};
    NSData *json=[NSJSONSerialization dataWithJSONObject:row options:NSJSONWritingPrettyPrinted error:nil];
    NSString *dir=NSSearchPathForDirectoriesInDomains(NSDocumentDirectory,NSUserDomainMask,YES).firstObject;
    [json writeToFile:[dir stringByAppendingPathComponent:@"bench-native.json"] atomically:YES];
}

@interface BenchNativeRecorder : NSObject
@end
@implementation BenchNativeRecorder
+ (void)load {
    dispatch_async(dispatch_get_main_queue(), ^{
        [NSNotificationCenter.defaultCenter addObserverForName:UIApplicationDidBecomeActiveNotification object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *n){BenchWriteSample();}];
        BenchWriteSample();
        [NSTimer scheduledTimerWithTimeInterval:30 repeats:YES block:^(NSTimer *t){
            if(UIApplication.sharedApplication.applicationState==UIApplicationStateActive) BenchWriteSample();
        }];
    });
}
@end
