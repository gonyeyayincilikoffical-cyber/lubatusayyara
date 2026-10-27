import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  VehicleConfig,
  DrivingInput,
  DrivingTelemetry,
  ParkingMission,
  CameraMode,
  TimeOfDay,
  WeatherType,
  GameMode,
} from '../types';
import { VehicleFactory, VehicleMeshObject } from './VehicleFactory';
import { CityBuilder, CollisionObstacle } from './CityBuilder';
import { PhysicsEngine } from './PhysicsEngine';
import { TrafficAndMultiplayerSystem } from './TrafficAndMultiplayerSystem';
import { Canvas2DGameView } from './Canvas2DGameView';

interface GameViewProps {
  vehicleConfig: VehicleConfig;
  drivingInput: DrivingInput;
  activeMission: ParkingMission | null;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  gameMode: GameMode;
  onTelemetryUpdate: (telemetry: DrivingTelemetry) => void;
  onMissionComplete: (stars: number) => void;
}

function createSafeWebGLRenderer(width: number, height: number): THREE.WebGLRenderer | null {
  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL is not available in this environment.');
      return null;
    }
  } catch (err) {
    console.warn('Error testing WebGL support:', err);
    return null;
  }

  // Attempt 1: High-performance WebGL
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    return renderer;
  } catch (e1) {
    console.warn('High-performance WebGL failed, attempting fallback WebGL:', e1);
  }

  // Attempt 2: Basic WebGL fallback
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    return renderer;
  } catch (e2) {
    console.warn('Basic WebGL renderer creation failed:', e2);
    return null;
  }
}

export const GameView: React.FC<GameViewProps> = ({
  vehicleConfig,
  drivingInput,
  activeMission,
  cameraMode,
  timeOfDay,
  weather,
  gameMode,
  onTelemetryUpdate,
  onMissionComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [is3DSupported, setIs3DSupported] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // References for render loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vehicleRef = useRef<VehicleMeshObject | null>(null);
  const physicsRef = useRef<PhysicsEngine>(new PhysicsEngine());
  const obstaclesRef = useRef<CollisionObstacle[]>([]);
  const targetIndicatorRef = useRef<THREE.Group | null>(null);
  const trafficSysRef = useRef<TrafficAndMultiplayerSystem | null>(null);
  const streetLightsRef = useRef<THREE.PointLight[]>([]);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Rain particles
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const rainSystemRef = useRef<THREE.Points | null>(null);

  // Drift / Tire smoke particles
  const smokeParticlesRef = useRef<{ mesh: THREE.Mesh; life: number; maxLife: number }[]>([]);

  // Orbit angles for garage
  const orbitRef = useRef({ theta: 0.8, phi: 0.4, radius: 6.5, isDragging: false, prevX: 0, prevY: 0 });

  // Keep latest props in refs to avoid re-triggering heavy scene rebuilds
  const inputRef = useRef(drivingInput);
  inputRef.current = drivingInput;

  const configRef = useRef(vehicleConfig);
  configRef.current = vehicleConfig;

  const missionRef = useRef(activeMission);
  missionRef.current = activeMission;

  const camModeRef = useRef(cameraMode);
  camModeRef.current = cameraMode;

  const timeOfDayRef = useRef(timeOfDay);
  timeOfDayRef.current = timeOfDay;

  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Safely create WebGL Renderer
    const renderer = createSafeWebGLRenderer(width, height);
    if (!renderer) {
      setIs3DSupported(false);
      return;
    }
    setIs3DSupported(true);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 800);
    cameraRef.current = camera;

    rendererRef.current = renderer;
    containerRef.current.replaceChildren(renderer.domElement);

    // Ambient / Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 100, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Sun / Directional Light with real-time soft shadows
    const sun = new THREE.DirectionalLight(0xfffaed, 2.2);
    sun.position.set(60, 90, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 250;
    const d = 50;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    sunLightRef.current = sun;

    // Build City Environment
    const cityResult = CityBuilder.buildCity();
    scene.add(cityResult.group);
    obstaclesRef.current = cityResult.obstacles;
    targetIndicatorRef.current = cityResult.targetIndicator;
    streetLightsRef.current = cityResult.streetLights;

    // Build Traffic & Multiplayer System
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);
    trafficSysRef.current = new TrafficAndMultiplayerSystem(trafficGroup);

    // Setup Rain Particle System
    const rainCount = 2500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 120;
      rainPos[i + 1] = Math.random() * 40;
      rainPos[i + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    rainGeoRef.current = rainGeo;

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    // Build Initial Vehicle
    const vObj = VehicleFactory.createVehicle(configRef.current);
    scene.add(vObj.root);
    vehicleRef.current = vObj;

    // Initial position
    physicsRef.current.reset({ x: 0, z: -30, rotY: 0 });

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Mouse / Touch drag for Garage Orbit Camera
    const handlePointerDown = (e: PointerEvent) => {
      orbitRef.current.isDragging = true;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!orbitRef.current.isDragging) return;
      const dx = e.clientX - orbitRef.current.prevX;
      const dy = e.clientY - orbitRef.current.prevY;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;

      orbitRef.current.theta -= dx * 0.008;
      orbitRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.2, orbitRef.current.phi + dy * 0.008));
    };
    const handlePointerUp = () => {
      orbitRef.current.isDragging = false;
    };
    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Animation Loop
    let lastTime = performance.now();
    let animationFrameId: number;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const currentVehicle = vehicleRef.current;
      const physics = physicsRef.current;
      const currentInput = inputRef.current;
      const currentConfig = configRef.current;
      const activeM = missionRef.current;

      // 1. Update Physics Engine
      const telemetry = physics.update(dt, currentInput, currentConfig, obstaclesRef.current, activeM);
      onTelemetryUpdate(telemetry);

      // Check Mission Completion
      if (telemetry.isParkedProperly && telemetry.parkingHoldTime >= telemetry.requiredHoldTime) {
        let stars = 1;
        if (telemetry.parkingAccuracy > 70) stars = 2;
        if (telemetry.parkingAccuracy > 88) stars = 3;
        onMissionComplete(stars);
      }

      // 2. Synchronize 3D Vehicle Transforms
      if (currentVehicle) {
        currentVehicle.root.position.copy(physics.position);
        currentVehicle.root.rotation.y = physics.rotationY;

        // Suspension body roll & pitch
        currentVehicle.chassisBody.rotation.z = physics.bodyRoll;
        currentVehicle.chassisBody.rotation.x = physics.bodyPitch;

        // Front wheels steering angle
        currentVehicle.frontLeftWheel.rotation.y = physics.steeringAngle;
        currentVehicle.frontRightWheel.rotation.y = physics.steeringAngle;

        // Wheel rolling rotation
        const wheelRollSpeed = (physics.speedKmh / 3.6 / 0.34) * dt;
        const rollWheel = (wheel: THREE.Group) => {
          const hub = wheel.getObjectByName('rolling_hub');
          if (hub) hub.rotation.x += wheelRollSpeed;
        };
        rollWheel(currentVehicle.frontLeftWheel);
        rollWheel(currentVehicle.frontRightWheel);
        rollWheel(currentVehicle.rearLeftWheel);
        rollWheel(currentVehicle.rearRightWheel);

        // Turn steering wheel inside cockpit
        if (currentVehicle.steeringWheel) {
          currentVehicle.steeringWheel.rotation.z = -physics.steeringAngle * 2.8;
        }

        // Headlights on/off
        const lightsOn = currentInput.headlights || timeOfDayRef.current === 'night';
        currentVehicle.leftHeadlight.intensity = lightsOn ? 7.5 : 0;
        currentVehicle.rightHeadlight.intensity = lightsOn ? 7.5 : 0;

        // Taillights brighten on braking or in reverse
        currentVehicle.taillightMaterials.forEach((mat) => {
          if (telemetry.isBraking) {
            mat.emissiveIntensity = 2.8;
          } else if (lightsOn) {
            mat.emissiveIntensity = 0.8;
          } else {
            mat.emissiveIntensity = 0.1;
          }
        });

        // Reverse light
        currentVehicle.reverseLightMaterials.forEach((mat) => {
          mat.emissiveIntensity = telemetry.isReversing ? 2.2 : 0;
        });

        // Drift smoke creation
        if (telemetry.isDrifting && Math.abs(physics.speedKmh) > 15) {
          createDriftSmoke(scene, currentVehicle.root.position, currentVehicle.root.rotation.y);
        }
      }

      // Update smoke particles
      updateSmokeParticles(scene, dt);

      // 3. Update Traffic & Multiplayer
      if (trafficSysRef.current) {
        trafficSysRef.current.update(dt, physics.position);
      }

      // 4. Update Target Parking Zone Indicator
      if (targetIndicatorRef.current && activeM) {
        targetIndicatorRef.current.visible = true;
        targetIndicatorRef.current.position.set(activeM.targetPos.x, 0, activeM.targetPos.z);
        targetIndicatorRef.current.rotation.y = activeM.targetPos.rotY;

        // Floating 'P' bobbing and spinning
        const pIcon = targetIndicatorRef.current.getObjectByName('floating_p_icon');
        if (pIcon) {
          pIcon.position.y = 4.2 + Math.sin(now * 0.003) * 0.4;
          pIcon.rotation.y += dt * 1.5;
        }
      } else if (targetIndicatorRef.current) {
        targetIndicatorRef.current.visible = false;
      }

      // 5. Update Rain particles
      if (rainSystemRef.current && rainGeoRef.current) {
        if (rainSystemRef.current.visible && currentVehicle) {
          const positions = rainGeoRef.current.attributes.position.array as Float32Array;
          const carPos = currentVehicle.root.position;
          rainSystemRef.current.position.x = carPos.x;
          rainSystemRef.current.position.z = carPos.z;

          for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= dt * 38;
            if (positions[i] < 0) {
              positions[i] = 35;
            }
          }
          rainGeoRef.current.attributes.position.needsUpdate = true;
        }
      }

      // 6. Camera Controllers
      updateCamera(camera, currentVehicle, physics, dt);

      // 7. Render Scene
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
    };
  }, [retryCount]);

  // Update vehicle when vehicleConfig changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (vehicleRef.current) {
      sceneRef.current.remove(vehicleRef.current.root);
    }
    const newV = VehicleFactory.createVehicle(vehicleConfig);
    sceneRef.current.add(newV.root);
    vehicleRef.current = newV;
  }, [vehicleConfig]);

  // Update mission start position
  useEffect(() => {
    if (activeMission) {
      physicsRef.current.reset(activeMission.startPos);
    }
  }, [activeMission]);

  // Update Environment Lighting for Time of Day & Weather
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current || !hemiLightRef.current) return;

    if (timeOfDay === 'day') {
      sceneRef.current.background = new THREE.Color(0x38bdf8);
      sceneRef.current.fog = new THREE.FogExp2(0x38bdf8, 0.003);
      sunLightRef.current.color.set(0xfffaed);
      sunLightRef.current.intensity = 2.2;
      hemiLightRef.current.intensity = 0.7;
      streetLightsRef.current.forEach((l) => (l.intensity = 0));
    } else if (timeOfDay === 'sunset') {
      sceneRef.current.background = new THREE.Color(0xf97316);
      sceneRef.current.fog = new THREE.FogExp2(0xfb923c, 0.004);
      sunLightRef.current.color.set(0xfed7aa);
      sunLightRef.current.intensity = 1.6;
      hemiLightRef.current.intensity = 0.5;
      streetLightsRef.current.forEach((l) => (l.intensity = 1.5));
    } else {
      // Night
      sceneRef.current.background = new THREE.Color(0x060913);
      sceneRef.current.fog = new THREE.FogExp2(0x060913, 0.005);
      sunLightRef.current.color.set(0x38bdf8);
      sunLightRef.current.intensity = 0.25;
      hemiLightRef.current.intensity = 0.2;
      streetLightsRef.current.forEach((l) => (l.intensity = 3.2));
    }

    if (rainSystemRef.current) {
      rainSystemRef.current.visible = weather === 'rain';
      if (weather === 'rain') {
        sceneRef.current.background = new THREE.Color(0x1e293b);
        sceneRef.current.fog = new THREE.FogExp2(0x334155, 0.008);
      }
    }
  }, [timeOfDay, weather]);

  // Helper to spawn drift smoke particles
  const createDriftSmoke = (scene: THREE.Scene, carPos: THREE.Vector3, rotY: number) => {
    if (smokeParticlesRef.current.length > 30) return;

    const smokeGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.2, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);

    // Position near rear tires
    const offsetSide = (Math.random() - 0.5) * 1.5;
    const rearOffset = -1.6;
    const right = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
    const forward = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));

    smoke.position
      .copy(carPos)
      .addScaledVector(forward, rearOffset)
      .addScaledVector(right, offsetSide);
    smoke.position.y = 0.2;

    scene.add(smoke);
    smokeParticlesRef.current.push({ mesh: smoke, life: 0, maxLife: 0.6 + Math.random() * 0.3 });
  };

  const updateSmokeParticles = (scene: THREE.Scene, dt: number) => {
    for (let i = smokeParticlesRef.current.length - 1; i >= 0; i--) {
      const p = smokeParticlesRef.current[i];
      p.life += dt;
      p.mesh.position.y += dt * 1.2;
      p.mesh.scale.addScalar(dt * 2.5);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p.life / p.maxLife) * 0.45;

      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        smokeParticlesRef.current.splice(i, 1);
      }
    }
  };

  // Helper to update cameras smoothly
  const updateCamera = (
    camera: THREE.PerspectiveCamera,
    vehicle: VehicleMeshObject | null,
    physics: PhysicsEngine,
    dt: number
  ) => {
    if (!vehicle) return;

    const carPos = vehicle.root.position;
    const rotY = physics.rotationY;
    const forward = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));

    if (gameModeRef.current === 'garage') {
      // 360-degree Orbit Camera around vehicle
      const o = orbitRef.current;
      const camX = carPos.x + Math.sin(o.theta) * Math.cos(o.phi) * o.radius;
      const camY = carPos.y + Math.sin(o.phi) * o.radius + 0.6;
      const camZ = carPos.z + Math.cos(o.theta) * Math.cos(o.phi) * o.radius;

      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1.0, dt * 10));
      camera.lookAt(carPos.x, carPos.y + 0.65, carPos.z);
      camera.fov = 55;
      camera.updateProjectionMatrix();
      return;
    }

    const mode = camModeRef.current;

    // Dynamic FOV based on speed
    const speedRatio = Math.min(1.0, Math.abs(physics.speedKmh) / 220);
    const targetFov = mode === 'top_down' ? 50 : 62 + speedRatio * 16;
    camera.fov += (targetFov - camera.fov) * Math.min(1.0, dt * 5);
    camera.updateProjectionMatrix();

    if (mode === 'chase') {
      // Third-person smooth follow
      const distBehind = 6.2;
      const heightAbove = 2.4;
      const targetPos = carPos
        .clone()
        .addScaledVector(forward, -distBehind)
        .add(new THREE.Vector3(0, heightAbove, 0));

      camera.position.lerp(targetPos, Math.min(1.0, dt * 8));
      camera.lookAt(carPos.x, carPos.y + 1.1, carPos.z);
    } else if (mode === 'close_chase') {
      const distBehind = 4.4;
      const heightAbove = 1.6;
      const targetPos = carPos
        .clone()
        .addScaledVector(forward, -distBehind)
        .add(new THREE.Vector3(0, heightAbove, 0));

      camera.position.lerp(targetPos, Math.min(1.0, dt * 12));
      camera.lookAt(carPos.x, carPos.y + 0.9, carPos.z);
    } else if (mode === 'cockpit') {
      // Driver's eye view inside cabin
      const driverEye = carPos
        .clone()
        .addScaledVector(forward, 0.1)
        .add(new THREE.Vector3(-0.35, 1.1, 0));
      const lookTarget = carPos.clone().addScaledVector(forward, 25).add(new THREE.Vector3(0, 0.9, 0));

      camera.position.copy(driverEye);
      camera.lookAt(lookTarget);
    } else if (mode === 'hood') {
      // Front bumper/hood cam
      const hoodPos = carPos
        .clone()
        .addScaledVector(forward, 1.8)
        .add(new THREE.Vector3(0, 0.75, 0));
      const lookTarget = carPos.clone().addScaledVector(forward, 35).add(new THREE.Vector3(0, 0.75, 0));

      camera.position.copy(hoodPos);
      camera.lookAt(lookTarget);
    } else if (mode === 'top_down') {
      // Aerial 90-degree parking radar cam directly above
      const targetPos = new THREE.Vector3(carPos.x, carPos.y + 16, carPos.z);
      camera.position.lerp(targetPos, Math.min(1.0, dt * 14));
      camera.lookAt(carPos.x, carPos.y, carPos.z);
    }
  };

  if (is3DSupported === false) {
    return (
      <Canvas2DGameView
        vehicleConfig={vehicleConfig}
        drivingInput={drivingInput}
        activeMission={activeMission}
        cameraMode={cameraMode}
        timeOfDay={timeOfDay}
        weather={weather}
        gameMode={gameMode}
        onTelemetryUpdate={onTelemetryUpdate}
        onMissionComplete={onMissionComplete}
        onRetryWebGL={() => {
          setIs3DSupported(null);
          setRetryCount((c) => c + 1);
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      id="three-game-canvas-container"
      className="relative w-full h-full overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing"
    />
  );
};
