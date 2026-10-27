import React, { useState, useEffect, useRef } from 'react';
import {
  DrivingInput,
  DrivingTelemetry,
  ParkingMission,
  CameraMode,
  TimeOfDay,
  WeatherType,
  GameMode,
  GearMode,
} from '../types';
import {
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
  Trophy,
  Users,
  Flame,
  Radio,
  Zap,
} from 'lucide-react';
import { globalAudio } from '../audio/EngineAudio';

interface HUDProps {
  telemetry: DrivingTelemetry;
  drivingInput: DrivingInput;
  activeMission: ParkingMission | null;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  playerMoney: number;
  playerXp: number;
  onInputChange: (updates: Partial<DrivingInput>) => void;
  onCameraChange: () => void;
  onTimeOfDayChange: (t: TimeOfDay) => void;
  onWeatherToggle: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenMultiplayer: () => void;
  onResetCar: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  drivingInput,
  activeMission,
  cameraMode,
  timeOfDay,
  weather,
  playerMoney,
  playerXp,
  onInputChange,
  onCameraChange,
  onTimeOfDayChange,
  onWeatherToggle,
  onOpenGarage,
  onOpenMissions,
  onOpenMultiplayer,
  onResetCar,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [steeringAngle, setSteeringAngle] = useState(0); // For rotatable steering wheel UI
  const isDraggingWheel = useRef(false);
  const wheelCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Initialize audio on first key press if needed
      globalAudio.init();

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          onInputChange({ throttle: 1 });
          break;
        case 's':
        case 'arrowdown':
          onInputChange({ brake: 1 });
          break;
        case 'a':
        case 'arrowleft':
          onInputChange({ steer: -1 });
          break;
        case 'd':
        case 'arrowright':
          onInputChange({ steer: 1 });
          break;
        case ' ':
          onInputChange({ handbrake: true });
          break;
        case 'c':
          onCameraChange();
          break;
        case 'h':
          onInputChange({ horn: true });
          break;
        case 'l':
          onInputChange({ headlights: !drivingInput.headlights });
          break;
        case 'shift':
          onInputChange({ boost: true });
          break;
        case '1':
          onInputChange({ gear: 'P' });
          break;
        case '2':
          onInputChange({ gear: 'R' });
          break;
        case '3':
          onInputChange({ gear: 'N' });
          break;
        case '4':
          onInputChange({ gear: 'D' });
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          onInputChange({ throttle: 0 });
          break;
        case 's':
        case 'arrowdown':
          onInputChange({ brake: 0 });
          break;
        case 'a':
        case 'arrowleft':
        case 'd':
        case 'arrowright':
          onInputChange({ steer: 0 });
          break;
        case ' ':
          onInputChange({ handbrake: false });
          break;
        case 'h':
          onInputChange({ horn: false });
          break;
        case 'shift':
          onInputChange({ boost: false });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [drivingInput, onInputChange, onCameraChange]);

  const handleMuteToggle = () => {
    globalAudio.init();
    const muted = globalAudio.toggleMute();
    setIsMuted(muted);
  };

  // Steering wheel touch / drag
  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    globalAudio.init();
    const rect = e.currentTarget.getBoundingClientRect();
    wheelCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    isDraggingWheel.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWheel.current) return;
    const dx = e.clientX - wheelCenterRef.current.x;
    const dy = e.clientY - wheelCenterRef.current.y;
    const angleRad = Math.atan2(dx, -dy);
    const maxDeg = 120;
    const deg = Math.max(-maxDeg, Math.min(maxDeg, (angleRad * 180) / Math.PI));
    setSteeringAngle(deg);
    onInputChange({ steer: deg / maxDeg });
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWheel.current = false;
    setSteeringAngle(0);
    onInputChange({ steer: 0 });
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  // Sensor proximity color
  const getSensorColor = (dist: number) => {
    if (dist < 0.4) return 'bg-rose-500 text-rose-300 animate-pulse';
    if (dist < 1.2) return 'bg-amber-500 text-amber-300';
    return 'bg-emerald-500 text-emerald-300';
  };

  return (
    <div id="game-hud-overlay" className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Player stats & active mission banner */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-3.5 py-1.5 shadow-lg">
            <div className="flex items-center gap-1.5 font-racing text-amber-400 font-bold text-lg">
              <span>₺</span>
              <span>{playerMoney.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-1 text-sky-400 text-sm font-semibold">
              <Zap className="w-4 h-4" />
              <span>{playerXp} XP</span>
            </div>
          </div>

          {/* Active Mission info */}
          {activeMission && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-sky-500/40 rounded-xl px-3 py-2 text-xs max-w-xs shadow-md">
              <div className="flex items-center justify-between font-bold text-sky-400 mb-0.5">
                <span>{activeMission.titleTr}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600/30">
                  {activeMission.difficulty}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-tight line-clamp-2">{activeMission.descriptionTr}</p>
            </div>
          )}
        </div>

        {/* Center: Drift Points Banner (when drifting) */}
        {telemetry.driftPoints > 0 && (
          <div className="pointer-events-none flex flex-col items-center animate-bounce">
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-rose-600 border border-amber-300/40 rounded-2xl px-4 py-1.5 shadow-lg shadow-rose-950/60 text-white font-racing">
              <Flame className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold">DRIFT</span>
              <span className="text-xl font-bold">{telemetry.driftPoints.toLocaleString()}</span>
              <span className="text-xs text-yellow-300 font-bold">{telemetry.driftAngle}°</span>
            </div>
          </div>
        )}

        {/* Right: Quick Menus & Environment Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Environment controls */}
          <div className="flex items-center bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 gap-1 shadow-lg">
            <button
              id="time-day-btn"
              onClick={() => onTimeOfDayChange('day')}
              className={`p-2 rounded-lg transition ${timeOfDay === 'day' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Gündüz"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              id="time-sunset-btn"
              onClick={() => onTimeOfDayChange('sunset')}
              className={`p-2 rounded-lg transition ${timeOfDay === 'sunset' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Günbatımı"
            >
              <Sunset className="w-4 h-4" />
            </button>
            <button
              id="time-night-btn"
              onClick={() => onTimeOfDayChange('night')}
              className={`p-2 rounded-lg transition ${timeOfDay === 'night' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Gece"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              id="weather-toggle-btn"
              onClick={onWeatherToggle}
              className={`p-2 rounded-lg transition ${weather === 'rain' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Yağmur"
            >
              <CloudRain className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Navigation */}
          <button
            id="hud-missions-btn"
            onClick={onOpenMissions}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-lg"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Görevler</span>
          </button>

          <button
            id="hud-garage-btn"
            onClick={onOpenGarage}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-lg"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Garaj / Modifiye</span>
          </button>

          <button
            id="hud-multiplayer-btn"
            onClick={onOpenMultiplayer}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-lg"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Online Lobi</span>
          </button>

          <button
            id="hud-mute-btn"
            onClick={handleMuteToggle}
            className="p-2 bg-slate-900/85 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/60 shadow-lg"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. PARKING PRECISION RADAR SENSOR (Visible when near parking slot or obstacles) */}
      {(telemetry.isInsideParkingZone || telemetry.parkingSensorDist < 3.0) && (
        <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col items-center min-w-[260px]">
            <div className="flex items-center justify-between w-full text-xs font-bold mb-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                PARK SENSÖRÜ
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${getSensorColor(telemetry.parkingSensorDist)}`}>
                {telemetry.parkingSensorDist < 0.35 ? 'DUR! (<35 cm)' : `${telemetry.parkingSensorDist} m`}
              </span>
            </div>

            {/* Visual proximity bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-75 ${
                  telemetry.parkingSensorDist < 0.4
                    ? 'bg-rose-500 w-full'
                    : telemetry.parkingSensorDist < 1.2
                    ? 'bg-amber-400 w-3/4'
                    : 'bg-emerald-400 w-1/3'
                }`}
              />
            </div>

            {/* Parking Zone Alignment Meter */}
            {telemetry.isInsideParkingZone && (
              <div className="flex flex-col items-center w-full pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between w-full text-xs mb-1">
                  <span className="text-slate-400">Park Hizalaması:</span>
                  <span className="font-racing font-bold text-sky-400">{telemetry.parkingAccuracy}%</span>
                </div>

                {/* Hold position countdown circle/bar */}
                {telemetry.isParkedProperly ? (
                  <div className="flex flex-col items-center w-full">
                    <span className="text-emerald-400 text-xs font-bold animate-pulse mb-1">
                      KUSURSUZ! BEKLEYİN...
                    </span>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-100"
                        style={{ width: `${(telemetry.parkingHoldTime / telemetry.requiredHoldTime) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-amber-400 text-[11px]">
                    {Math.abs(telemetry.speedKmh) > 1.5
                      ? 'Aracı tamamen durdurun (P / N)'
                      : 'Aracı sarı çizgilerin ortasına hizalayın'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM CONTROLS & GAUGES */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {/* Left: Interactive Steering Wheel or Left/Right arrows */}
        <div className="flex flex-col items-center gap-2">
          {/* Reset position & Camera switch quick buttons */}
          <div className="flex items-center gap-2 mb-1">
            <button
              id="camera-switch-btn"
              onClick={onCameraChange}
              className="flex items-center gap-1 bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md transition"
              title="Kamera Değiştir (C)"
            >
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span className="uppercase text-[11px]">{cameraMode.replace('_', ' ')}</span>
            </button>
            <button
              id="reset-car-btn"
              onClick={onResetCar}
              className="p-1.5 bg-slate-900/85 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 rounded-xl shadow-md transition"
              title="Aracı Düzelt / Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Rotatable Steering Wheel */}
          <div
            id="steering-wheel-control"
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerUp}
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-slate-900/85 border-4 border-slate-700 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            style={{ transform: `rotate(${steeringAngle}deg)` }}
          >
            {/* Wheel Spokes */}
            <div className="absolute w-full h-3 bg-slate-800" />
            <div className="absolute w-3 h-1/2 bottom-0 bg-slate-800" />
            {/* Center Hub */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-950 to-slate-800 border-2 border-slate-600 flex items-center justify-center z-10">
              <span className="text-[9px] font-racing font-bold text-sky-400">CPM</span>
            </div>
            {/* 12 o'clock center marker */}
            <div className="absolute top-1 w-3 h-2 bg-rose-500 rounded-sm" />
          </div>

          {/* Alternative touch arrow buttons for simple touch */}
          <div className="flex gap-2 mt-1 sm:hidden">
            <button
              onPointerDown={() => onInputChange({ steer: -1 })}
              onPointerUp={() => onInputChange({ steer: 0 })}
              className="w-14 h-10 bg-slate-900/80 active:bg-sky-600 rounded-lg text-white font-bold text-lg flex items-center justify-center border border-slate-700"
            >
              ◀
            </button>
            <button
              onPointerDown={() => onInputChange({ steer: 1 })}
              onPointerUp={() => onInputChange({ steer: 0 })}
              className="w-14 h-10 bg-slate-900/80 active:bg-sky-600 rounded-lg text-white font-bold text-lg flex items-center justify-center border border-slate-700"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Center: Realistic Speedometer & Tachometer Display */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex items-center gap-4">
            {/* Speedometer Circle */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center bg-slate-900/60 shadow-inner">
                {/* Needle / Gauge arc simulation */}
                <span className="font-racing text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  {Math.abs(telemetry.speedKmh)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400">KM / H</span>
              </div>
            </div>

            {/* Tachometer RPM Bar & Gear Selector */}
            <div className="flex flex-col gap-2">
              {/* RPM Bar */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span>RPM x1000</span>
                  <span className={`font-bold ${telemetry.rpm > 6500 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
                    {telemetry.rpm}
                  </span>
                </div>
                <div className="w-32 sm:w-40 bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800 flex">
                  <div
                    className={`h-full transition-all duration-75 ${
                      telemetry.rpm > 6500 ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, (telemetry.rpm / 7500) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Interactive Gear Shifter: P - R - N - D */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['P', 'R', 'N', 'D'] as GearMode[]).map((gear) => (
                  <button
                    key={gear}
                    id={`gear-${gear}-btn`}
                    onClick={() => onInputChange({ gear })}
                    className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg font-racing font-bold text-xs flex items-center justify-center transition ${
                      drivingInput.gear === gear
                        ? gear === 'R'
                          ? 'bg-rose-600 text-white shadow-lg'
                          : gear === 'P'
                          ? 'bg-amber-600 text-white shadow-lg'
                          : 'bg-sky-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {gear}
                  </button>
                ))}
              </div>

              {/* Handbrake status badge */}
              <div className="flex items-center justify-between text-[11px]">
                <button
                  id="handbrake-btn"
                  onClick={() => onInputChange({ handbrake: !drivingInput.handbrake })}
                  className={`px-2 py-0.5 rounded font-bold text-[10px] transition border ${
                    drivingInput.handbrake
                      ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  EL FRENİ (SPACE)
                </button>
                <button
                  id="horn-btn"
                  onPointerDown={() => onInputChange({ horn: true })}
                  onPointerUp={() => onInputChange({ horn: false })}
                  className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 active:bg-amber-500 active:text-white"
                >
                  KORNA (H)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pedals (Brake & Gas) */}
        <div className="flex items-end gap-3">
          {/* Brake Pedal */}
          <button
            id="brake-pedal-btn"
            onPointerDown={() => onInputChange({ brake: 1 })}
            onPointerUp={() => onInputChange({ brake: 0 })}
            className={`w-14 sm:w-16 h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-end pb-3 text-xs font-bold tracking-wider transition-all select-none touch-none border ${
              drivingInput.brake > 0
                ? 'bg-rose-600 border-rose-400 text-white translate-y-1.5 shadow-inner'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 shadow-xl'
            }`}
          >
            <div className="w-8 h-1 bg-slate-600 rounded-full mb-2" />
            <span>FREN</span>
            <span className="text-[9px] text-slate-500 font-mono">(S)</span>
          </button>

          {/* Gas (Throttle) Pedal */}
          <button
            id="gas-pedal-btn"
            onPointerDown={() => onInputChange({ throttle: 1 })}
            onPointerUp={() => onInputChange({ throttle: 0 })}
            className={`w-14 sm:w-16 h-32 sm:h-36 rounded-2xl flex flex-col items-center justify-end pb-3 text-xs font-bold tracking-wider transition-all select-none touch-none border ${
              drivingInput.throttle > 0
                ? 'bg-emerald-600 border-emerald-400 text-white translate-y-2 shadow-inner'
                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 shadow-xl'
            }`}
          >
            <div className="w-8 h-1 bg-slate-600 rounded-full mb-3" />
            <span>GAZ</span>
            <span className="text-[9px] text-slate-500 font-mono">(W)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
