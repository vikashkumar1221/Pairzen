export type NavigationTab =
  | "overview"
  | "devices"
  | "files"
  | "camera"
  | "remote"
  | "activity"
  | "security"
  | "settings";

export type DevicePlatform = "android" | "ios" | "macos";

export interface DeviceModel {
  id: string;
  name: string;
  platform: DevicePlatform;
  model: string;
  osVersion: string;
  isTrusted: boolean;
  connectionState: "connected" | "disconnected" | "transferring";
  battery: { level: number; isCharging: boolean };
  ipAddress: string;
  capabilities: {
    fileSharing: boolean;
    clipboardSync: boolean;
    cameraStream: boolean;
    remoteInput: boolean;
    biometricApproval: boolean;
    notificationMirroring: boolean;
  };
}

export interface TransferModel {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  direction: "incoming" | "outgoing";
  state: "in_progress" | "completed" | "paused" | "failed";
  progress: number;
  speed: string;
  sha256: string;
  sha256Verified: boolean;
  timestamp: string;
}

export interface ActivityModel {
  id: string;
  title: string;
  details: string;
  icon: string;
  timestamp: string;
  isSimulated: boolean;
}
