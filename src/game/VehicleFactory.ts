import * as THREE from 'three';
import { VehicleConfig } from '../types';

export interface VehicleMeshObject {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterials: THREE.MeshStandardMaterial[];
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  steeringWheel?: THREE.Object3D;
  leftHeadlight: THREE.SpotLight;
  rightHeadlight: THREE.SpotLight;
  taillightMaterials: THREE.MeshStandardMaterial[];
  reverseLightMaterials: THREE.MeshStandardMaterial[];
  underglowLight?: THREE.PointLight;
  spoilerGroup?: THREE.Group;
  exhaustPipes: THREE.Vector3[];
  chassisBody: THREE.Group; // for suspension tilt & roll
}

export class VehicleFactory {
  public static createVehicle(config: VehicleConfig): VehicleMeshObject {
    const root = new THREE.Group();
    root.name = `vehicle_${config.id}`;

    // Chassis body group that rolls/pitches on suspension
    const chassisBody = new THREE.Group();
    root.add(chassisBody);

    // Body Material based on finish
    const bodyMat = this.createBodyMaterial(config.bodyColor, config.finish);
    const bodyMaterials: THREE.MeshStandardMaterial[] = [bodyMat];

    // Carbon / Trim material
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.4,
      metalness: 0.8,
    });

    // Glass material
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x101520,
      metalness: 0.1,
      roughness: 0.1,
      transmission: Math.max(0.1, 1 - config.windowTint),
      transparent: true,
      opacity: 0.3 + config.windowTint * 0.65,
      reflectivity: 0.9,
    });

    // Interior / Cockpit material
    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x1e222d,
      roughness: 0.85,
    });

    // Caliper material
    const caliperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.caliperColor),
      roughness: 0.3,
      metalness: 0.6,
    });

    // Rim material
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.rimColor),
      roughness: 0.25,
      metalness: 0.85,
    });

    // Tire rubber material
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Headlight glass / LED emissive
    const headLightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });

    // Taillight glow
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x990000,
      emissive: 0xdd1111,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const taillightMaterials: THREE.MeshStandardMaterial[] = [taillightMat];

    // Reverse light glow
    const reverseLightMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const reverseLightMaterials: THREE.MeshStandardMaterial[] = [reverseLightMat];

    // Build specific car body based on model
    const { bodyMesh, spoilerMount, exhaustPipes, steeringWheel } = this.buildBodyShape(
      config,
      chassisBody,
      bodyMat,
      trimMat,
      glassMat,
      interiorMat,
      headLightGlowMat,
      taillightMat,
      reverseLightMat
    );

    // Build Spoiler if configured
    let spoilerGroup: THREE.Group | undefined;
    if (config.spoilerStyle !== 'none' && spoilerMount) {
      spoilerGroup = this.buildSpoiler(config.spoilerStyle, trimMat, bodyMat);
      spoilerMount.add(spoilerGroup);
    }

    // Build Wheels with suspension height and camber
    const wheelY = 0.35 + config.suspensionHeight;
    const wheelTrack = config.id === 'luxury_suv' ? 1.05 : 0.98;
    const wheelBase = config.id === 'luxury_suv' ? 1.55 : 1.45;

    const frontLeftWheel = this.buildWheelAssembly(tireMat, rimMat, caliperMat, config, true, true);
    frontLeftWheel.position.set(-wheelTrack, wheelY, wheelBase);
    root.add(frontLeftWheel);

    const frontRightWheel = this.buildWheelAssembly(tireMat, rimMat, caliperMat, config, true, false);
    frontRightWheel.position.set(wheelTrack, wheelY, wheelBase);
    root.add(frontRightWheel);

    const rearLeftWheel = this.buildWheelAssembly(tireMat, rimMat, caliperMat, config, false, true);
    rearLeftWheel.position.set(-wheelTrack, wheelY, -wheelBase);
    root.add(rearLeftWheel);

    const rearRightWheel = this.buildWheelAssembly(tireMat, rimMat, caliperMat, config, false, false);
    rearRightWheel.position.set(wheelTrack, wheelY, -wheelBase);
    root.add(rearRightWheel);

    // Realistic Headlight Projectors
    const leftHeadlight = new THREE.SpotLight(0xfffaed, 8, 45, Math.PI / 6, 0.4, 1.2);
    leftHeadlight.position.set(-0.7, 0.6, wheelBase + 1.1);
    leftHeadlight.target.position.set(-0.7, 0, wheelBase + 15);
    chassisBody.add(leftHeadlight);
    chassisBody.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xfffaed, 8, 45, Math.PI / 6, 0.4, 1.2);
    rightHeadlight.position.set(0.7, 0.6, wheelBase + 1.1);
    rightHeadlight.target.position.set(0.7, 0, wheelBase + 15);
    chassisBody.add(rightHeadlight);
    chassisBody.add(rightHeadlight.target);

    // Underglow Neon
    let underglowLight: THREE.PointLight | undefined;
    if (config.underglowColor) {
      underglowLight = new THREE.PointLight(new THREE.Color(config.underglowColor), 3.5, 6.0, 1.5);
      underglowLight.position.set(0, 0.15, 0);
      chassisBody.add(underglowLight);

      // Neon tube mesh under chassis
      const tubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8);
      const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(config.underglowColor) });
      const leftTube = new THREE.Mesh(tubeGeo, neonMat);
      leftTube.rotation.x = Math.PI / 2;
      leftTube.position.set(-0.85, 0.12, 0);
      chassisBody.add(leftTube);

      const rightTube = new THREE.Mesh(tubeGeo, neonMat);
      rightTube.rotation.x = Math.PI / 2;
      rightTube.position.set(0.85, 0.12, 0);
      chassisBody.add(rightTube);
    }

    return {
      root,
      bodyMesh,
      bodyMaterials,
      frontLeftWheel,
      frontRightWheel,
      rearLeftWheel,
      rearRightWheel,
      steeringWheel,
      leftHeadlight,
      rightHeadlight,
      taillightMaterials,
      reverseLightMaterials,
      underglowLight,
      spoilerGroup,
      exhaustPipes,
      chassisBody,
    };
  }

  public static createBodyMaterial(hex: string, finish: string): THREE.MeshStandardMaterial {
    const color = new THREE.Color(hex);
    switch (finish) {
      case 'matte':
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.85,
          metalness: 0.1,
        });
      case 'metallic':
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.25,
          metalness: 0.85,
        });
      case 'pearl':
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.2,
          metalness: 0.65,
        });
      case 'gloss':
      default:
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.15,
          metalness: 0.3,
        });
    }
  }

  private static buildBodyShape(
    config: VehicleConfig,
    parent: THREE.Group,
    bodyMat: THREE.Material,
    trimMat: THREE.Material,
    glassMat: THREE.Material,
    interiorMat: THREE.Material,
    headlightMat: THREE.Material,
    taillightMat: THREE.Material,
    reverseLightMat: THREE.Material
  ) {
    // Distinct styling parameters based on car category
    const isSUV = config.id === 'luxury_suv';
    const isHyper = config.id === 'hyper_nero';
    const isE30 = config.id === 'drift_e30';
    const isHatch = config.id === 'city_hatch';

    const carLength = isSUV ? 4.9 : isHatch ? 4.2 : 4.6;
    const carWidth = isSUV ? 2.05 : isHyper ? 2.15 : 1.95;
    const roofHeight = isSUV ? 1.75 : isHyper ? 1.15 : 1.35;

    // 1. Lower Main Body Chassis
    const lowerBodyGeo = new THREE.BoxGeometry(carWidth, 0.45, carLength);
    const bodyMesh = new THREE.Mesh(lowerBodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.set(0, 0.45, 0);
    parent.add(bodyMesh);

    // 2. Cabin / Greenhouse
    const cabinLength = isSUV ? 3.0 : isHatch ? 2.6 : 2.3;
    const cabinWidth = carWidth * 0.82;
    const cabinHeight = roofHeight - 0.55;
    const cabinZ = isSUV ? -0.15 : isHatch ? -0.25 : -0.2;

    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.68 + cabinHeight / 2, cabinZ);
    cabin.castShadow = true;
    parent.add(cabin);

    // Roof panel
    const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.96, 0.05, cabinLength * 0.96);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 0.68 + cabinHeight + 0.025, cabinZ);
    roof.castShadow = true;
    parent.add(roof);

    // 3. Hood (Bonnet)
    const hoodLength = isSUV ? 1.3 : isHatch ? 0.95 : 1.45;
    const hoodGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.12, hoodLength);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.72, cabinZ + cabinLength / 2 + hoodLength / 2);
    hood.rotation.x = -0.05;
    hood.castShadow = true;
    parent.add(hood);

    // Hood vents for sports/muscle cars
    if (config.id === 'muscle_v8' || config.id === 'coupe_gt') {
      const scoopGeo = new THREE.BoxGeometry(0.5, 0.08, 0.6);
      const scoop = new THREE.Mesh(scoopGeo, trimMat);
      scoop.position.set(0, 0.82, hood.position.z);
      parent.add(scoop);
    }

    // 4. Front Bumper, Grille & Splitter
    const bumperGeo = new THREE.BoxGeometry(carWidth * 0.95, 0.35, 0.35);
    const bumper = new THREE.Mesh(bumperGeo, bodyMat);
    bumper.position.set(0, 0.32, carLength / 2 - 0.05);
    bumper.castShadow = true;
    parent.add(bumper);

    const grilleGeo = new THREE.BoxGeometry(carWidth * 0.55, 0.22, 0.08);
    const grille = new THREE.Mesh(grilleGeo, trimMat);
    grille.position.set(0, 0.35, carLength / 2 + 0.12);
    parent.add(grille);

    const splitterGeo = new THREE.BoxGeometry(carWidth * 1.02, 0.05, 0.28);
    const splitter = new THREE.Mesh(splitterGeo, trimMat);
    splitter.position.set(0, 0.15, carLength / 2 + 0.05);
    parent.add(splitter);

    // 5. Rear Diffuser & Bumper
    const rearBumperGeo = new THREE.BoxGeometry(carWidth * 0.95, 0.36, 0.3);
    const rearBumper = new THREE.Mesh(rearBumperGeo, bodyMat);
    rearBumper.position.set(0, 0.34, -carLength / 2 + 0.05);
    rearBumper.castShadow = true;
    parent.add(rearBumper);

    const diffuserGeo = new THREE.BoxGeometry(carWidth * 0.85, 0.12, 0.25);
    const diffuser = new THREE.Mesh(diffuserGeo, trimMat);
    diffuser.position.set(0, 0.18, -carLength / 2 - 0.06);
    parent.add(diffuser);

    // 6. Headlights (3D Mesh + Emissive Glow)
    const headlightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    const leftHL = new THREE.Mesh(headlightGeo, headlightMat);
    leftHL.position.set(-carWidth * 0.38, 0.52, carLength / 2 + 0.11);
    parent.add(leftHL);

    const rightHL = new THREE.Mesh(headlightGeo, headlightMat);
    rightHL.position.set(carWidth * 0.38, 0.52, carLength / 2 + 0.11);
    parent.add(rightHL);

    // 7. Taillights (Left & Right strips)
    const taillightGeo = new THREE.BoxGeometry(isHyper ? carWidth * 0.75 : 0.42, 0.1, 0.05);
    const leftTL = new THREE.Mesh(taillightGeo, taillightMat);
    leftTL.position.set(isHyper ? 0 : -carWidth * 0.35, 0.56, -carLength / 2 - 0.1);
    parent.add(leftTL);

    if (!isHyper) {
      const rightTL = new THREE.Mesh(taillightGeo, taillightMat);
      rightTL.position.set(carWidth * 0.35, 0.56, -carLength / 2 - 0.1);
      parent.add(rightTL);
    }

    // Reverse light strip
    const revLightGeo = new THREE.BoxGeometry(0.2, 0.06, 0.05);
    const revLight = new THREE.Mesh(revLightGeo, reverseLightMat);
    revLight.position.set(0, 0.45, -carLength / 2 - 0.1);
    parent.add(revLight);

    // 8. Interior: Seats & Steering Wheel
    const seatGeo = new THREE.BoxGeometry(0.42, 0.55, 0.45);
    const driverSeat = new THREE.Mesh(seatGeo, interiorMat);
    driverSeat.position.set(-0.35, 0.75, 0.1);
    parent.add(driverSeat);

    const passengerSeat = new THREE.Mesh(seatGeo, interiorMat);
    passengerSeat.position.set(0.35, 0.75, 0.1);
    parent.add(passengerSeat);

    // Steering Wheel
    const steerWheelGroup = new THREE.Group();
    const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 16), trimMat);
    steerWheelGroup.add(rimTorus);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), trimMat);
    hub.rotation.x = Math.PI / 2;
    steerWheelGroup.add(hub);
    steerWheelGroup.position.set(-0.35, 0.92, 0.52);
    steerWheelGroup.rotation.x = -Math.PI / 8;
    parent.add(steerWheelGroup);

    // 9. Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.16, 0.09, 0.12);
    const leftMirror = new THREE.Mesh(mirrorGeo, trimMat);
    leftMirror.position.set(-carWidth / 2 - 0.08, 0.85, 0.6);
    parent.add(leftMirror);

    const rightMirror = new THREE.Mesh(mirrorGeo, trimMat);
    rightMirror.position.set(carWidth / 2 + 0.08, 0.85, 0.6);
    parent.add(rightMirror);

    // 10. Exhaust Tips
    const exhaustPipes: THREE.Vector3[] = [];
    const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });

    const numPipes = isHyper ? 4 : 2;
    for (let i = 0; i < numPipes; i++) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.x = Math.PI / 2;
      const xOffset = numPipes === 4 ? -0.3 + i * 0.2 : (i === 0 ? -0.45 : 0.45);
      pipe.position.set(xOffset, 0.22, -carLength / 2 - 0.12);
      parent.add(pipe);
      exhaustPipes.push(new THREE.Vector3(xOffset, 0.22, -carLength / 2 - 0.25));
    }

    // Spoiler Mount point
    const spoilerMount = new THREE.Group();
    spoilerMount.position.set(0, 0.72, -carLength / 2 + 0.2);
    parent.add(spoilerMount);

    return {
      bodyMesh,
      spoilerMount,
      exhaustPipes,
      steeringWheel: steerWheelGroup,
    };
  }

  private static buildSpoiler(style: string, trimMat: THREE.Material, bodyMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    if (style === 'ducktail') {
      const wingGeo = new THREE.BoxGeometry(1.4, 0.08, 0.25);
      const wing = new THREE.Mesh(wingGeo, bodyMat);
      wing.rotation.x = -0.3;
      wing.position.set(0, 0.08, -0.05);
      group.add(wing);
    } else if (style === 'gt_wing') {
      // Dual Uprights
      const strutGeo = new THREE.BoxGeometry(0.04, 0.28, 0.15);
      const leftStrut = new THREE.Mesh(strutGeo, trimMat);
      leftStrut.position.set(-0.45, 0.14, 0);
      group.add(leftStrut);

      const rightStrut = new THREE.Mesh(strutGeo, trimMat);
      rightStrut.position.set(0.45, 0.14, 0);
      group.add(rightStrut);

      // Main GT Wing Airfoil
      const wingGeo = new THREE.BoxGeometry(1.65, 0.04, 0.35);
      const wing = new THREE.Mesh(wingGeo, trimMat);
      wing.position.set(0, 0.3, 0);
      wing.rotation.x = -0.1;
      group.add(wing);

      // Endplates
      const plateGeo = new THREE.BoxGeometry(0.02, 0.18, 0.38);
      const leftPlate = new THREE.Mesh(plateGeo, trimMat);
      leftPlate.position.set(-0.83, 0.3, 0);
      group.add(leftPlate);

      const rightPlate = new THREE.Mesh(plateGeo, trimMat);
      rightPlate.position.set(0.83, 0.3, 0);
      group.add(rightPlate);
    } else if (style === 'carbon_lip') {
      const lipGeo = new THREE.BoxGeometry(1.45, 0.04, 0.15);
      const lip = new THREE.Mesh(lipGeo, trimMat);
      lip.position.set(0, 0.04, 0);
      group.add(lip);
    } else if (style === 'hyper_dual') {
      // Hyper active wing
      const wingGeo = new THREE.BoxGeometry(1.8, 0.05, 0.4);
      const wing = new THREE.Mesh(wingGeo, trimMat);
      wing.position.set(0, 0.22, 0.05);
      wing.rotation.x = -0.15;
      group.add(wing);
    }

    return group;
  }

  private static buildWheelAssembly(
    tireMat: THREE.Material,
    rimMat: THREE.Material,
    caliperMat: THREE.Material,
    config: VehicleConfig,
    isFront: boolean,
    isLeft: boolean
  ): THREE.Group {
    const pivot = new THREE.Group();
    pivot.name = isFront ? (isLeft ? 'wheel_FL' : 'wheel_FR') : isLeft ? 'wheel_RL' : 'wheel_RR';

    // Camber tilt
    pivot.rotation.z = isLeft ? config.camberAngle : -config.camberAngle;

    // Rolling hub group that rotates with vehicle speed
    const rollingHub = new THREE.Group();
    rollingHub.name = 'rolling_hub';
    pivot.add(rollingHub);

    // Tire geometry
    const tireRadius = 0.34;
    const tireWidth = 0.28;
    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    rollingHub.add(tire);

    // Rim Outer Ring
    const rimRadius = 0.24;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.98, 16);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rollingHub.add(rim);

    // Spokes based on rim style
    const spokeCount = config.rimStyle === 'deep_dish' ? 5 : config.rimStyle === 'mesh' ? 10 : 6;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.03, rimRadius * 1.8, 0.04);
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.z = angle;
      spoke.position.x = isLeft ? -tireWidth / 2 + 0.02 : tireWidth / 2 - 0.02;
      rollingHub.add(spoke);
    }

    // Brake Disc (Rotor)
    const discGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.03, 16);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.z = Math.PI / 2;
    rollingHub.add(disc);

    // Stationary Brake Caliper (does not spin with wheel)
    const caliperGeo = new THREE.BoxGeometry(0.07, 0.12, 0.09);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(isLeft ? -0.04 : 0.04, 0.14, 0);
    pivot.add(caliper);

    return pivot;
  }
}
