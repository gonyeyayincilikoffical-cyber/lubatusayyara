import React, { useEffect, useRef, useState } from 'react';
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
import { PhysicsEngine } from './PhysicsEngine';
import { CityBuilder, CollisionObstacle } from './CityBuilder';
import { AlertTriangle, RefreshCw, Eye } from 'lucide-react';

interface Canvas2DGameViewProps {
  vehicleConfig: VehicleConfig;
  drivingInput: DrivingInput;
  activeMission: ParkingMission | null;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  gameMode: GameMode;
  onTelemetryUpdate: (telemetry: DrivingTelemetry) => void;
  onMissionComplete: (stars: number) => void;
  onRetryWebGL?: () => void;
}

interface SkidMark {
  x: number;
  z: number;
  alpha: number;
}

interface SmokeParticle2D {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  alpha: number;
  maxLife: number;
  life: number;
}

export const Canvas2DGameView: React.FC<Canvas2DGameViewProps> = ({
  vehicleConfig,
  drivingInput,
  activeMission,
  cameraMode,
  timeOfDay,
  weather,
  gameMode,
  onTelemetryUpdate,
  onMissionComplete,
  onRetryWebGL,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsRef = useRef<PhysicsEngine>(new PhysicsEngine());
  const obstaclesRef = useRef<CollisionObstacle[]>([]);

  // Skid marks and smoke
  const skidMarksRef = useRef<SkidMark[]>([]);
  const smokeRef = useRef<SmokeParticle2D[]>([]);

  // Camera tracking position
  const camPosRef = useRef<{ x: number; z: number }>({ x: 0, z: -30 });
  const zoomLevelRef = useRef<number>(24); // pixels per world meter

  // Latest props refs
  const inputRef = useRef(drivingInput);
  inputRef.current = drivingInput;

  const configRef = useRef(vehicleConfig);
  configRef.current = vehicleConfig;

  const missionRef = useRef(activeMission);
  missionRef.current = activeMission;

  const timeOfDayRef = useRef(timeOfDay);
  timeOfDayRef.current = timeOfDay;

  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // Initialize obstacles and car position
  useEffect(() => {
    // Generate city obstacles for physics collision
    const city = CityBuilder.buildCity();
    obstaclesRef.current = city.obstacles;

    if (activeMission) {
      physicsRef.current.reset(activeMission.startPos);
      camPosRef.current = { x: activeMission.startPos.x, z: activeMission.startPos.z };
    } else {
      physicsRef.current.reset({ x: 0, z: -30, rotY: 0 });
      camPosRef.current = { x: 0, z: -30 };
    }
  }, []);

  // Update mission start position
  useEffect(() => {
    if (activeMission) {
      physicsRef.current.reset(activeMission.startPos);
      camPosRef.current = { x: activeMission.startPos.x, z: activeMission.startPos.z };
    }
  }, [activeMission]);

  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    // Rain drops simulation
    const rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
    for (let i = 0; i < 150; i++) {
      rainDrops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 15 + Math.random() * 10,
        len: 12 + Math.random() * 8,
      });
    }

    const render = (now: number) => {
      animationId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Ensure canvas matches screen resolution
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Update Physics
      const physics = physicsRef.current;
      const telemetry = physics.update(
        dt,
        inputRef.current,
        configRef.current,
        obstaclesRef.current,
        missionRef.current
      );
      onTelemetryUpdate(telemetry);

      // Check Mission Completion
      if (telemetry.isParkedProperly && telemetry.parkingHoldTime >= telemetry.requiredHoldTime) {
        let stars = 1;
        if (telemetry.parkingAccuracy > 70) stars = 2;
        if (telemetry.parkingAccuracy > 88) stars = 3;
        onMissionComplete(stars);
      }

      // Smooth camera follow
      const targetCamX = physics.position.x;
      const targetCamZ = physics.position.z;
      camPosRef.current.x += (targetCamX - camPosRef.current.x) * Math.min(1.0, dt * 6);
      camPosRef.current.z += (targetCamZ - camPosRef.current.z) * Math.min(1.0, dt * 6);

      // Dynamic zoom based on speed
      const speedRatio = Math.min(1.0, Math.abs(physics.speedKmh) / 160);
      const targetZoom = 24 - speedRatio * 8; // zoom out slightly when fast
      zoomLevelRef.current += (targetZoom - zoomLevelRef.current) * Math.min(1.0, dt * 4);
      const zoom = zoomLevelRef.current;

      // Coordinate converter: world meter (x, z) to canvas screen pixel (sx, sy)
      const toScreenX = (wx: number) => width / 2 + (wx - camPosRef.current.x) * zoom;
      const toScreenY = (wz: number) => height / 2 + (wz - camPosRef.current.z) * zoom;

      // 2. Clear Background based on TimeOfDay
      const tOfDay = timeOfDayRef.current;
      let bgCol = '#1e293b'; // Default asphalt/urban dark
      if (tOfDay === 'day') bgCol = '#334155';
      else if (tOfDay === 'sunset') bgCol = '#2a2336';
      else bgCol = '#090d16';

      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw City Ground & Roads
      // Main Boulevard (North-South): x: -10 to 10, z: -80 to 80
      const bX1 = toScreenX(-10);
      const bX2 = toScreenX(10);
      const bZ1 = toScreenY(-80);
      const bZ2 = toScreenY(80);

      ctx.fillStyle = '#111827'; // Dark asphalt
      ctx.fillRect(bX1, bZ1, bX2 - bX1, bZ2 - bZ1);

      // Cross Avenue (East-West): x: -80 to 80, z: -10 to 10
      const aX1 = toScreenX(-80);
      const aX2 = toScreenX(80);
      const aZ1 = toScreenY(-10);
      const aZ2 = toScreenY(10);
      ctx.fillRect(aX1, aZ1, aX2 - aX1, aZ2 - aZ1);

      // Central Parking Lot Area: x: 12 to 46, z: -46 to -14
      const pLotX1 = toScreenX(12);
      const pLotX2 = toScreenX(46);
      const pLotZ1 = toScreenY(-46);
      const pLotZ2 = toScreenY(-14);
      ctx.fillStyle = '#171e2e';
      ctx.fillRect(pLotX1, pLotZ1, pLotX2 - pLotX1, pLotZ2 - pLotZ1);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pLotX1, pLotZ1, pLotX2 - pLotX1, pLotZ2 - pLotZ1);

      // Draw Road Markings
      ctx.save();
      // Boulevard yellow center line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(toScreenX(0), toScreenY(-80));
      ctx.lineTo(toScreenX(0), toScreenY(80));
      ctx.stroke();

      // Cross Avenue center line
      ctx.beginPath();
      ctx.moveTo(toScreenX(-80), toScreenY(0));
      ctx.lineTo(toScreenX(80), toScreenY(0));
      ctx.stroke();
      ctx.restore();

      // Parking Bays in Parking Lot
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        // North Row
        const slotX = 16 + i * 3.5;
        const slotZ = -40;
        const sx = toScreenX(slotX);
        const sy = toScreenY(slotZ);
        const sw = 3.0 * zoom;
        const sh = 5.5 * zoom;
        ctx.strokeRect(sx, sy, sw, sh);

        // South Row
        const sSlotZ = -26;
        const sSy = toScreenY(sSlotZ);
        ctx.strokeRect(sx, sSy, sw, sh);
      }

      // Gas Station Area: x: -44 to -28, z: -38 to -18
      const gasX1 = toScreenX(-44);
      const gasX2 = toScreenX(-28);
      const gasZ1 = toScreenY(-38);
      const gasZ2 = toScreenY(-18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gasX1, gasZ1, gasX2 - gasX1, gasZ2 - gasZ1);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(gasX1, gasZ1, gasX2 - gasX1, gasZ2 - gasZ1);

      // Gas Pumps
      ctx.fillStyle = '#059669';
      [
        [-38.5, -32],
        [-33.5, -32],
        [-38.5, -24],
        [-33.5, -24],
      ].forEach(([px, pz]) => {
        const sx = toScreenX(px) - 0.4 * zoom;
        const sy = toScreenY(pz) - 0.7 * zoom;
        ctx.fillRect(sx, sy, 0.8 * zoom, 1.4 * zoom);
      });

      // 4. Draw Skid Marks
      if (skidMarksRef.current.length > 0) {
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.5)';
        ctx.lineWidth = 3;
        skidMarksRef.current.forEach((sm) => {
          sm.alpha -= dt * 0.04;
          if (sm.alpha > 0) {
            ctx.fillStyle = `rgba(15, 23, 42, ${sm.alpha})`;
            const sx = toScreenX(sm.x);
            const sy = toScreenY(sm.z);
            ctx.fillRect(sx - 2, sy - 2, 4, 4);
          }
        });
        skidMarksRef.current = skidMarksRef.current.filter((sm) => sm.alpha > 0);
      }

      // 5. Draw Target Parking Indicator (Active Mission)
      const curMission = missionRef.current;
      if (curMission) {
        const target = curMission.targetPos;
        const tsx = toScreenX(target.x);
        const tsy = toScreenY(target.z);
        const tw = (target.width || 3.0) * zoom;
        const tl = (target.length || 5.8) * zoom;

        ctx.save();
        ctx.translate(tsx, tsy);
        ctx.rotate(-target.rotY);

        // Pulsing glowing background
        const pulse = 0.35 + Math.sin(now * 0.005) * 0.15;
        ctx.fillStyle = telemetry.isInsideParkingZone
          ? `rgba(16, 185, 129, ${pulse + 0.2})`
          : `rgba(245, 158, 11, ${pulse})`;
        ctx.fillRect(-tw / 2, -tl / 2, tw, tl);

        // Dashed animated border
        ctx.strokeStyle = telemetry.isInsideParkingZone ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -now * 0.02;
        ctx.strokeRect(-tw / 2, -tl / 2, tw, tl);

        // Big 'P' letter in target slot
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, Math.round(14 * (zoom / 20)))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', 0, 0);

        ctx.restore();
      }

      // 6. Draw City Obstacles & Buildings
      obstaclesRef.current.forEach((obs) => {
        const x1 = toScreenX(obs.minX);
        const y1 = toScreenY(obs.minZ);
        const w = (obs.maxX - obs.minX) * zoom;
        const h = (obs.maxZ - obs.minZ) * zoom;

        // Skip offscreen
        if (x1 + w < 0 || x1 > width || y1 + h < 0 || y1 > height) return;

        if (obs.type === 'building') {
          // Building drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(x1 + 4, y1 + 4, w, h);

          // Building roof
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x1, y1, w, h);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(x1, y1, w, h);

          // AC units / rooftop accents
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x1 + w * 0.2, y1 + h * 0.2, w * 0.25, h * 0.25);
        } else if (obs.type === 'parked_car') {
          // Parked car body
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x1 + 2, y1 + 2, w, h);
          ctx.fillStyle = '#475569';
          ctx.fillRect(x1, y1, w, h);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, y1, w, h);
        } else if (obs.type === 'barrier') {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x1, y1, w, h);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x1, y1, w, h);
        }
      });

      // 7. Draw Other Online / Traffic Cars
      const traffic = [
        { name: '🇹🇷 Burak_Drift', x: 34, z: -32, rot: 0, color: '#e11d48' },
        { name: '⚡ SpeedDemon', x: -4.5, z: 45, rot: Math.PI, color: '#06b6d4' },
        { name: '🔥 ApexRacer', x: -45, z: 4.5, rot: Math.PI / 2, color: '#f59e0b' },
      ];

      traffic.forEach((car) => {
        const cx = toScreenX(car.x);
        const cy = toScreenY(car.z);
        if (cx < -50 || cx > width + 50 || cy < -50 || cy > height + 50) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-car.rot);

        // Car body
        const carW = 2.0 * zoom;
        const carL = 4.4 * zoom;
        ctx.fillStyle = car.color;
        ctx.fillRect(-carW / 2, -carL / 2, carW, carL);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-carW / 2, -carL / 2, carW, carL);

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-carW * 0.35, -carL * 0.2, carW * 0.7, carL * 0.35);

        ctx.restore();

        // Player Tag
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(cx - 45, cy - carL - 16, 90, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(car.name, cx, cy - carL - 4);
      });

      // 8. Record Drift Skid Marks & Smoke
      if (telemetry.isDrifting || (inputRef.current.brake > 0 && Math.abs(telemetry.speedKmh) > 20)) {
        skidMarksRef.current.push({
          x: physics.position.x + (Math.random() - 0.5) * 1.4,
          z: physics.position.z + (Math.random() - 0.5) * 1.4,
          alpha: 0.6,
        });

        // Add smoke
        smokeRef.current.push({
          x: physics.position.x,
          z: physics.position.z,
          vx: (Math.random() - 0.5) * 3,
          vz: (Math.random() - 0.5) * 3,
          radius: 3 + Math.random() * 4,
          alpha: 0.5,
          life: 0,
          maxLife: 0.8,
        });
      }

      // Draw and update smoke
      smokeRef.current.forEach((sm) => {
        sm.life += dt;
        sm.x += sm.vx * dt;
        sm.z += sm.vz * dt;
        sm.radius += dt * 8;
        const alpha = (1 - sm.life / sm.maxLife) * sm.alpha;
        if (alpha > 0) {
          ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
          ctx.beginPath();
          ctx.arc(toScreenX(sm.x), toScreenY(sm.z), sm.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      smokeRef.current = smokeRef.current.filter((sm) => sm.life < sm.maxLife);

      // 9. Draw Player Vehicle
      const px = toScreenX(physics.position.x);
      const py = toScreenY(physics.position.z);
      const rot = physics.rotationY;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-rot);

      const pCarW = 2.0 * zoom;
      const pCarL = 4.4 * zoom;

      // Underglow Neon (if equipped)
      if (configRef.current.underglowColor) {
        ctx.shadowColor = configRef.current.underglowColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = configRef.current.underglowColor;
        ctx.fillRect(-pCarW / 2 - 4, -pCarL / 2 - 4, pCarW + 8, pCarL + 8);
        ctx.shadowBlur = 0;
      }

      // Headlight Beams (Cones in front of car)
      const isNight = tOfDay === 'night' || tOfDay === 'sunset';
      if (inputRef.current.headlights || isNight) {
        const beamGrad = ctx.createLinearGradient(0, 0, 0, pCarL * 2.5);
        beamGrad.addColorStop(0, 'rgba(255, 255, 220, 0.45)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 220, 0.0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        // Left cone
        ctx.moveTo(-pCarW * 0.35, pCarL / 2);
        ctx.lineTo(-pCarW * 0.9, pCarL * 2.5);
        ctx.lineTo(0, pCarL * 2.5);
        ctx.closePath();
        ctx.fill();

        // Right cone
        ctx.beginPath();
        ctx.moveTo(pCarW * 0.35, pCarL / 2);
        ctx.lineTo(0, pCarL * 2.5);
        ctx.lineTo(pCarW * 0.9, pCarL * 2.5);
        ctx.closePath();
        ctx.fill();
      }

      // Car Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(-pCarW / 2 + 3, -pCarL / 2 + 3, pCarW, pCarL);

      // Wheels
      ctx.fillStyle = configRef.current.rimColor || '#334155';
      const wheelW = 0.45 * zoom;
      const wheelL = 1.0 * zoom;
      const steerRad = physics.steeringAngle;

      // Front Left Wheel (steers)
      ctx.save();
      ctx.translate(-pCarW / 2 + wheelW / 2, pCarL * 0.3);
      ctx.rotate(-steerRad);
      ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
      ctx.restore();

      // Front Right Wheel (steers)
      ctx.save();
      ctx.translate(pCarW / 2 - wheelW / 2, pCarL * 0.3);
      ctx.rotate(-steerRad);
      ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
      ctx.restore();

      // Rear Left & Right Wheels
      ctx.fillRect(-pCarW / 2, -pCarL * 0.35, wheelW, wheelL);
      ctx.fillRect(pCarW / 2 - wheelW, -pCarL * 0.35, wheelW, wheelL);

      // Car Main Body
      ctx.fillStyle = configRef.current.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-pCarW / 2, -pCarL / 2, pCarW, pCarL, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glass / Windshields
      ctx.fillStyle = `rgba(15, 23, 42, ${0.4 + configRef.current.windowTint * 0.55})`;
      // Front Windshield
      ctx.fillRect(-pCarW * 0.38, pCarL * 0.05, pCarW * 0.76, pCarL * 0.2);
      // Rear Glass
      ctx.fillRect(-pCarW * 0.38, -pCarL * 0.25, pCarW * 0.76, pCarL * 0.16);
      // Roof
      ctx.fillStyle = configRef.current.bodyColor;
      ctx.fillRect(-pCarW * 0.35, -pCarL * 0.08, pCarW * 0.7, pCarL * 0.15);

      // Headlights / Taillights
      ctx.fillStyle = '#ffffff';
      // Front headlights
      ctx.fillRect(-pCarW * 0.45, pCarL / 2 - 4, pCarW * 0.25, 4);
      ctx.fillRect(pCarW * 0.2, pCarL / 2 - 4, pCarW * 0.25, 4);

      // Rear brake lights (bright red when braking or reversing)
      ctx.fillStyle = inputRef.current.brake > 0 || inputRef.current.gear === 'R' ? '#ef4444' : '#991b1b';
      if (inputRef.current.brake > 0) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      }
      ctx.fillRect(-pCarW * 0.45, -pCarL / 2, pCarW * 0.25, 4);
      ctx.fillRect(pCarW * 0.2, -pCarL / 2, pCarW * 0.25, 4);
      ctx.shadowBlur = 0;

      // Spoiler (if equipped)
      if (configRef.current.spoilerStyle !== 'none') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-pCarW * 0.48, -pCarL / 2 - 5, pCarW * 0.96, 5);
      }

      ctx.restore();

      // 10. Weather Effects: Rain Streaks
      if (weatherRef.current === 'rain') {
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        rainDrops.forEach((drop) => {
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 3, drop.y + drop.len);
          drop.y += drop.speed;
          drop.x -= 1.5;
          if (drop.y > height) {
            drop.y = -10;
            drop.x = Math.random() * width;
          }
        });
        ctx.stroke();
      }

      ctx.restore();
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [onTelemetryUpdate, onMissionComplete]);

  return (
    <div id="canvas-2d-game-view" className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* 2D HTML5 Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Elegant Fallback Mode Notice Badge */}
      {showInfoBanner && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 border border-sky-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl max-w-lg text-xs">
          <div className="flex items-center gap-2 text-sky-400 font-bold whitespace-nowrap">
            <Eye className="w-4 h-4" />
            <span>2D Kuşbakışı Simülatör</span>
          </div>
          <span className="text-slate-300 text-[11px] leading-tight">
            Tarayıcıda WebGL donanım hızlandırması kapalı olduğu için oyun yüksek performanslı 2D modunda sorunsuz çalışıyor.
          </span>
          {onRetryWebGL && (
            <button
              onClick={onRetryWebGL}
              className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>3D Dene</span>
            </button>
          )}
          <button
            onClick={() => setShowInfoBanner(false)}
            className="text-slate-400 hover:text-white text-sm font-bold ml-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
