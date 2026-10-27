export type VehicleModelId = 
  | 'coupe_gt' 
  | 'muscle_v8' 
  | 'hyper_nero' 
  | 'drift_e30' 
  | 'luxury_suv' 
  | 'city_hatch';

export type PaintFinish = 'gloss' | 'metallic' | 'matte' | 'pearl';
export type RimStyle = 'sport' | 'deep_dish' | 'mesh' | 'racing' | 'luxury';
export type SpoilerStyle = 'none' | 'ducktail' | 'gt_wing' | 'carbon_lip' | 'hyper_dual';
export type DriveType = 'AWD' | 'RWD' | 'FWD';
export type GearMode = 'P' | 'R' | 'N' | 'D';
export type CameraMode = 'chase' | 'close_chase' | 'cockpit' | 'hood' | 'top_down';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type WeatherType = 'clear' | 'rain';
export type GameMode = 'free_roam' | 'parking_missions' | 'garage' | 'multiplayer_room';

export interface VehicleConfig {
  id: VehicleModelId;
  name: string;
  brand: string;
  category: string;
  price: number;
  unlocked: boolean;
  basePowerHp: number;
  baseTopSpeedKmh: number;
  driveType: DriveType;
  // Customization
  bodyColor: string;
  finish: PaintFinish;
  rimStyle: RimStyle;
  rimColor: string;
  spoilerStyle: SpoilerStyle;
  suspensionHeight: number; // -0.07 to +0.06
  camberAngle: number; // -0.14 to 0.0
  windowTint: number; // 0.0 to 0.95
  underglowColor: string | null;
  caliperColor: string;
  // Performance Tuning
  engineStage: 1 | 2 | 3 | 4;
  gearboxType: 'stock' | 'sport' | 'race';
  driftAngleLock: number; // 35 to 55 deg
  brakeStrength: number; // 1.0 to 2.0
}

export interface DrivingInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 to 1
  handbrake: boolean;
  gear: GearMode;
  headlights: boolean;
  hazards: boolean;
  horn: boolean;
  boost: boolean;
}

export interface DrivingTelemetry {
  speedKmh: number;
  rpm: number;
  currentGear: number;
  gearMode: GearMode;
  driftAngle: number;
  driftPoints: number;
  isDrifting: boolean;
  isBraking: boolean;
  isReversing: boolean;
  isColliding: boolean;
  collisionForce: number;
  parkingSensorDist: number; // Distance to nearest obstacle
  parkingAccuracy: number; // 0 - 100%
  isInsideParkingZone: boolean;
  isParkedProperly: boolean;
  parkingHoldTime: number; // seconds held parked
  requiredHoldTime: number; // 2.0s
}

export interface ParkingMission {
  id: number;
  title: string;
  titleTr: string;
  descriptionTr: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor' | 'Usta';
  startPos: { x: number; z: number; rotY: number };
  targetPos: { x: number; z: number; rotY: number; width: number; length: number };
  timeLimit: number;
  rewardMoney: number;
  rewardXp: number;
  completed: boolean;
  starsEarned: number; // 0 to 3
  bestTime?: number;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  carModel: VehicleModelId;
  carName: string;
  color: string;
  x: number;
  z: number;
  rotY: number;
  speedKmh: number;
  statusText?: string;
  pingMs: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSystem?: boolean;
}
