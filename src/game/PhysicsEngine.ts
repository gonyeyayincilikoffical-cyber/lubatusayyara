import * as THREE from 'three';
import { VehicleConfig, DrivingInput, DrivingTelemetry, ParkingMission } from '../types';
import { CollisionObstacle } from './CityBuilder';
import { globalAudio } from '../audio/EngineAudio';

export class PhysicsEngine {
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotationY: number = 0; // heading angle in radians
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public speedKmh: number = 0;
  public rpm: number = 900;
  public currentGear: number = 1;
  public steeringAngle: number = 0; // in radians
  public driftAngle: number = 0; // in degrees
  public driftPoints: number = 0;
  public isDrifting: boolean = false;
  public isColliding: boolean = false;
  public bodyPitch: number = 0;
  public bodyRoll: number = 0;
  public parkingHoldTimer: number = 0;

  // Gear ratios for 6-speed transmission
  private gearRatios = [3.8, 2.4, 1.7, 1.25, 0.98, 0.78];
  private finalDrive = 3.6;
  private prevThrottle: number = 0;

  constructor() {}

  public reset(pos: { x: number; z: number; rotY: number }) {
    this.position.set(pos.x, 0, pos.z);
    this.rotationY = pos.rotY;
    this.velocity.set(0, 0, 0);
    this.speedKmh = 0;
    this.rpm = 900;
    this.currentGear = 1;
    this.steeringAngle = 0;
    this.driftAngle = 0;
    this.driftPoints = 0;
    this.isDrifting = false;
    this.isColliding = false;
    this.bodyPitch = 0;
    this.bodyRoll = 0;
    this.parkingHoldTimer = 0;
  }

  public update(
    dt: number,
    input: DrivingInput,
    config: VehicleConfig,
    obstacles: CollisionObstacle[],
    activeMission: ParkingMission | null
  ): DrivingTelemetry {
    // 1. Steering computation with speed-dependent lock and centering
    const maxLockRad = THREE.MathUtils.degToRad(config.driftAngleLock);
    // As speed increases, max steering sensitivity softly scales down for stability
    const speedDamping = Math.max(0.35, 1.0 - (Math.abs(this.speedKmh) / 220) * 0.6);
    const targetSteer = input.steer * maxLockRad * speedDamping;
    const steerSpeed = 8.0; // rad/sec
    this.steeringAngle += (targetSteer - this.steeringAngle) * Math.min(1.0, dt * steerSpeed);

    // 2. Drive & Gear logic
    let engineForce = 0;
    const isReverse = input.gear === 'R';
    const isPark = input.gear === 'P';
    const isNeutral = input.gear === 'N';
    const isDrive = input.gear === 'D';

    // Base power calculated from car config & engine stage
    const stageMultiplier = 1 + (config.engineStage - 1) * 0.28;
    const totalPower = config.basePowerHp * stageMultiplier;
    const maxSpeedKmh = config.baseTopSpeedKmh * (1 + (config.engineStage - 1) * 0.12);

    if (isDrive) {
      // Automatic upshift & downshift
      const maxGear = 6;
      if (this.rpm > 6500 && this.currentGear < maxGear) {
        this.currentGear++;
        globalAudio.triggerGearShiftClick();
        this.rpm = 4200;
      } else if (this.rpm < 2200 && this.currentGear > 1) {
        this.currentGear--;
        this.rpm = 4800;
      }

      // Forward torque
      const gearRatio = this.gearRatios[this.currentGear - 1] * this.finalDrive;
      const torqueCurve = Math.max(0.2, Math.sin((this.rpm / 7500) * Math.PI));
      engineForce = input.throttle * (totalPower * 4.8 * (gearRatio / 10)) * torqueCurve;
    } else if (isReverse) {
      this.currentGear = -1;
      const reverseRatio = 3.6 * this.finalDrive;
      engineForce = -input.throttle * (totalPower * 3.5 * (reverseRatio / 10));
    } else if (isPark) {
      engineForce = 0;
    } else if (isNeutral) {
      engineForce = 0;
    }

    // Nitro/boost multiplier
    if (input.boost && input.throttle > 0.5) {
      engineForce *= 1.4;
    }

    // Detect throttle release for turbo blow-off sound
    if (this.prevThrottle > 0.75 && input.throttle < 0.2 && this.speedKmh > 30) {
      globalAudio.triggerTurboBlowoff();
    }
    this.prevThrottle = input.throttle;

    // 3. Direction vectors
    const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));
    const right = new THREE.Vector3(Math.cos(this.rotationY), 0, -Math.sin(this.rotationY));

    // Current forward & lateral speeds in m/s
    const forwardSpeedMs = this.velocity.dot(forward);
    const lateralSpeedMs = this.velocity.dot(right);
    this.speedKmh = forwardSpeedMs * 3.6;

    // 4. Update RPM
    if (isNeutral || isPark) {
      // Free revving
      const targetRpm = 900 + input.throttle * 6600;
      this.rpm += (targetRpm - this.rpm) * Math.min(1.0, dt * 10);
    } else {
      const speedRatio = Math.abs(this.speedKmh) / (maxSpeedKmh / this.currentGear);
      const targetRpm = Math.min(7500, Math.max(900, 900 + speedRatio * 6200 + input.throttle * 400));
      this.rpm += (targetRpm - this.rpm) * Math.min(1.0, dt * 8);
    }

    // 5. Braking and Friction
    let brakeForce = input.brake * config.brakeStrength * 5500;
    if (input.handbrake) {
      brakeForce += 9000;
    }
    if (isPark) {
      brakeForce += 20000;
    }

    // Rolling air resistance & friction
    const dragForce = 0.5 * 1.2 * 0.35 * (forwardSpeedMs * forwardSpeedMs) * Math.sign(forwardSpeedMs);
    const rollingResistance = forwardSpeedMs * 35;

    // Net longitudinal acceleration
    const carMass = config.id === 'luxury_suv' ? 2400 : config.id === 'hyper_nero' ? 1900 : 1550;
    let netLongForce = engineForce - dragForce - rollingResistance;

    if (Math.abs(forwardSpeedMs) > 0.1) {
      netLongForce -= Math.sign(forwardSpeedMs) * brakeForce;
    } else if (brakeForce > 0) {
      this.velocity.multiplyScalar(0.7);
    }

    const forwardAcc = netLongForce / carMass;
    const newForwardSpeed = forwardSpeedMs + forwardAcc * dt;

    // 6. Drift & Lateral Grip Dynamics
    let rearGrip = 0.95;
    if (input.handbrake) {
      rearGrip = 0.22; // Handbrake loss of rear traction
    } else if (config.driveType === 'RWD' && input.throttle > 0.8 && Math.abs(this.steeringAngle) > 0.2) {
      rearGrip = 0.45; // Power slide
    }

    const maxLateralFriction = rearGrip * 9.81 * 1.4;
    const lateralAcc = -lateralSpeedMs * maxLateralFriction;
    const newLateralSpeed = lateralSpeedMs + lateralAcc * dt;

    // Drift detection & angle
    const totalVel = Math.sqrt(newForwardSpeed * newForwardSpeed + newLateralSpeed * newLateralSpeed);
    if (totalVel > 4.0 && Math.abs(newLateralSpeed) > 1.2) {
      this.isDrifting = true;
      this.driftAngle = THREE.MathUtils.radToDeg(Math.atan2(Math.abs(newLateralSpeed), Math.abs(newForwardSpeed)));
      this.driftPoints += Math.floor(this.driftAngle * (Math.abs(this.speedKmh) / 20) * dt * 25);
    } else {
      this.isDrifting = false;
      this.driftAngle = 0;
    }

    // 7. Update yaw rotation (steering turns the car)
    const turnRadiusRate = (newForwardSpeed / 2.8) * Math.tan(this.steeringAngle);
    this.rotationY += turnRadiusRate * dt;

    // Update world velocity
    this.velocity.copy(forward).multiplyScalar(newForwardSpeed).addScaledVector(right, newLateralSpeed);

    // 8. Position integration & Collision response
    const proposedPos = this.position.clone().addScaledVector(this.velocity, dt);

    // Collision check against city obstacles
    const carHalfW = 1.0;
    const carHalfL = 2.3;
    let collided = false;
    let nearestDist = 999;

    for (const obs of obstacles) {
      // Check collision AABB
      if (
        proposedPos.x + carHalfW > obs.minX &&
        proposedPos.x - carHalfW < obs.maxX &&
        proposedPos.z + carHalfL > obs.minZ &&
        proposedPos.z - carHalfL < obs.maxZ
      ) {
        collided = true;
        // Bounce impulse
        this.velocity.multiplyScalar(-0.35);
        this.speedKmh *= -0.3;
        break;
      }

      // Calculate distance for parking radar
      const dx = Math.max(obs.minX - proposedPos.x, 0, proposedPos.x - obs.maxX);
      const dz = Math.max(obs.minZ - proposedPos.z, 0, proposedPos.z - obs.maxZ);
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
      }
    }

    this.isColliding = collided;
    if (!collided) {
      this.position.copy(proposedPos);
    }

    // Keep car on ground plane
    this.position.y = 0;

    // Update audio engine
    globalAudio.updateEngine(
      this.rpm,
      input.throttle,
      Math.abs(this.speedKmh),
      this.isDrifting,
      input.brake > 0.4 || input.handbrake
    );
    globalAudio.updateParkingSensor(nearestDist);
    globalAudio.setHorn(input.horn);

    // 9. Suspension Roll & Pitch
    // Roll with lateral acceleration (centrifugal tilt)
    const targetRoll = (-lateralSpeedMs * 0.04) + (this.steeringAngle * 0.02 * Math.min(1.0, Math.abs(this.speedKmh) / 50));
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(1.0, dt * 10);

    // Pitch with braking (dive) and acceleration (squat)
    const targetPitch = (forwardAcc * -0.0035);
    this.bodyPitch += (targetPitch - this.bodyPitch) * Math.min(1.0, dt * 12);

    // 10. Parking Zone Alignment Calculation
    let isInsideParkingZone = false;
    let parkingAccuracy = 0;
    let isParkedProperly = false;

    if (activeMission) {
      const target = activeMission.targetPos;
      const distToCenter = Math.hypot(this.position.x - target.x, this.position.z - target.z);

      // Angle alignment (difference modulo 180 degrees or 360)
      let angleDiffDeg = Math.abs(THREE.MathUtils.radToDeg(this.rotationY - target.rotY)) % 360;
      if (angleDiffDeg > 180) angleDiffDeg = 360 - angleDiffDeg;
      // Also accept reverse orientation if aligned (180 deg)
      if (Math.abs(angleDiffDeg - 180) < angleDiffDeg) {
        angleDiffDeg = Math.abs(angleDiffDeg - 180);
      }

      if (distToCenter < 3.2) {
        isInsideParkingZone = true;
        // Accuracy formula: 100% minus position penalty minus angle penalty
        const posScore = Math.max(0, 100 - (distToCenter / 2.5) * 60);
        const angleScore = Math.max(0, 100 - (angleDiffDeg / 30) * 40);
        parkingAccuracy = Math.round((posScore * 0.6 + angleScore * 0.4));

        // Proper park condition: inside zone, angle < 14 deg, speed < 2 km/h, gear P or stopped
        if (distToCenter < 1.2 && angleDiffDeg < 16 && Math.abs(this.speedKmh) < 1.5) {
          isParkedProperly = true;
          this.parkingHoldTimer += dt;
        } else {
          this.parkingHoldTimer = Math.max(0, this.parkingHoldTimer - dt * 2);
        }
      } else {
        this.parkingHoldTimer = 0;
      }
    }

    return {
      speedKmh: Math.round(this.speedKmh),
      rpm: Math.round(this.rpm),
      currentGear: this.currentGear,
      gearMode: input.gear,
      driftAngle: Math.round(this.driftAngle),
      driftPoints: this.driftPoints,
      isDrifting: this.isDrifting,
      isBraking: input.brake > 0.1 || input.handbrake,
      isReversing: isReverse,
      isColliding: collided,
      collisionForce: Math.abs(this.speedKmh),
      parkingSensorDist: Number(nearestDist.toFixed(2)),
      parkingAccuracy,
      isInsideParkingZone,
      isParkedProperly,
      parkingHoldTime: this.parkingHoldTimer,
      requiredHoldTime: 2.0,
    };
  }
}
