/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  VehicleConfig,
  DrivingInput,
  DrivingTelemetry,
  ParkingMission,
  CameraMode,
  TimeOfDay,
  WeatherType,
  GameMode,
  OnlinePlayer,
  ChatMessage,
} from './types';
import { INITIAL_CARS, PARKING_MISSIONS } from './data/gameData';
import { GameView } from './game/GameView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HUD } from './components/HUD';
import { GarageMenu } from './components/GarageMenu';
import { MissionsModal } from './components/MissionsModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { MissionSuccessModal } from './components/MissionSuccessModal';

export default function App() {
  // Vehicle & Tuning State
  const [vehicles, setVehicles] = useState<VehicleConfig[]>(() => {
    const saved = localStorage.getItem('cpm_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_CARS;
  });

  const [currentVehicle, setCurrentVehicle] = useState<VehicleConfig>(vehicles[0]);

  // Economy & Progression
  const [playerMoney, setPlayerMoney] = useState<number>(() => {
    const saved = localStorage.getItem('cpm_money');
    return saved ? parseInt(saved, 10) : 25000;
  });

  const [playerXp, setPlayerXp] = useState<number>(() => {
    const saved = localStorage.getItem('cpm_xp');
    return saved ? parseInt(saved, 10) : 350;
  });

  // Missions
  const [missions, setMissions] = useState<ParkingMission[]>(() => {
    const saved = localStorage.getItem('cpm_missions');
    return saved ? JSON.parse(saved) : PARKING_MISSIONS;
  });
  const [activeMission, setActiveMission] = useState<ParkingMission | null>(missions[0]);
  const [showSuccessModal, setShowSuccessModal] = useState<{ mission: ParkingMission; stars: number } | null>(null);

  // Environment & View Modes
  const [gameMode, setGameMode] = useState<GameMode>('free_roam');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<WeatherType>('clear');

  // Modals
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);

  // Driving Controls Input
  const [drivingInput, setDrivingInput] = useState<DrivingInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    gear: 'D',
    headlights: false,
    hazards: false,
    horn: false,
    boost: false,
  });

  // Real-Time Telemetry
  const [telemetry, setTelemetry] = useState<DrivingTelemetry>({
    speedKmh: 0,
    rpm: 900,
    currentGear: 1,
    gearMode: 'D',
    driftAngle: 0,
    driftPoints: 0,
    isDrifting: false,
    isBraking: false,
    isReversing: false,
    isColliding: false,
    collisionForce: 0,
    parkingSensorDist: 999,
    parkingAccuracy: 0,
    isInsideParkingZone: false,
    isParkedProperly: false,
    parkingHoldTime: 0,
    requiredHoldTime: 2.0,
  });

  // Multiplayer online players list
  const [onlinePlayers] = useState<OnlinePlayer[]>([
    {
      id: 'p1',
      name: '🇹🇷 Burak_Drift',
      carModel: 'drift_e30',
      carName: 'E30 Drift King',
      color: '#e11d48',
      x: 34,
      z: -32,
      rotY: 0,
      speedKmh: 65,
      statusText: 'Otoparkta Drift Atıyor',
      pingMs: 18,
    },
    {
      id: 'p2',
      name: '⚡ SpeedDemon',
      carModel: 'hyper_nero',
      carName: 'Centurion Hyper V16',
      color: '#06b6d4',
      x: -4.5,
      z: 45,
      rotY: Math.PI,
      speedKmh: 120,
      statusText: 'Bulvarda Hız Denemesi',
      pingMs: 28,
    },
    {
      id: 'p3',
      name: '🔥 ApexRacer',
      carModel: 'muscle_v8',
      carName: 'Shelby GT-800 V8',
      color: '#f59e0b',
      x: -45,
      z: 4.5,
      rotY: Math.PI / 2,
      speedKmh: 80,
      statusText: 'Caddede Geziyor',
      pingMs: 32,
    },
    {
      id: 'p4',
      name: '💎 VIP_Emre',
      carModel: 'luxury_suv',
      carName: 'Titan G-63 AMG',
      color: '#1e293b',
      x: 22,
      z: 8,
      rotY: -Math.PI / 2,
      speedKmh: 50,
      statusText: 'Plaza Otoparkında',
      pingMs: 22,
    },
  ]);

  // Multiplayer Chat Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      sender: 'SİSTEM',
      text: 'İstanbul #01 Sunucusuna bağlandınız. Keyifli sürüşler!',
      time: '12:00',
      isSystem: true,
    },
    {
      id: 'msg-1',
      sender: 'Burak_Drift',
      text: 'Otoparka gelin, drift alanı bomboş!',
      time: '12:01',
    },
    {
      id: 'msg-2',
      sender: 'SpeedDemon',
      text: 'Bulvarda drag yapacak var mı?',
      time: '12:02',
    },
  ]);

  // Input updater
  const handleInputChange = useCallback((updates: Partial<DrivingInput>) => {
    setDrivingInput((prev) => ({ ...prev, ...updates }));
  }, []);

  // Camera Switcher
  const handleCameraChange = useCallback(() => {
    const modes: CameraMode[] = ['chase', 'close_chase', 'cockpit', 'hood', 'top_down'];
    setCameraMode((prev) => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  // Time of Day and Weather toggles
  const handleTimeOfDayChange = useCallback((t: TimeOfDay) => {
    setTimeOfDay(t);
  }, []);

  const handleWeatherToggle = useCallback(() => {
    setWeather((prev) => (prev === 'clear' ? 'rain' : 'clear'));
  }, []);

  // Vehicle selection & update
  const handleSelectVehicle = useCallback((v: VehicleConfig) => {
    setCurrentVehicle(v);
  }, []);

  const handleUpdateVehicle = useCallback(
    (updated: VehicleConfig) => {
      setCurrentVehicle(updated);
      setVehicles((prev) => {
        const next = prev.map((v) => (v.id === updated.id ? updated : v));
        localStorage.setItem('cpm_vehicles', JSON.stringify(next));
        return next;
      });
    },
    []
  );

  // Mission Selection
  const handleSelectMission = useCallback((m: ParkingMission) => {
    setActiveMission(m);
    setShowMissionsModal(false);
    setGameMode('parking_missions');
  }, []);

  const handleFreeRoam = useCallback(() => {
    setActiveMission(null);
    setShowMissionsModal(false);
    setGameMode('free_roam');
  }, []);

  // Mission Completed Handler
  const handleMissionComplete = useCallback(
    (stars: number) => {
      if (!activeMission) return;

      // Update rewards
      const newMoney = playerMoney + activeMission.rewardMoney;
      const newXp = playerXp + activeMission.rewardXp;
      setPlayerMoney(newMoney);
      setPlayerXp(newXp);
      localStorage.setItem('cpm_money', newMoney.toString());
      localStorage.setItem('cpm_xp', newXp.toString());

      // Update mission completion & stars
      setMissions((prev) => {
        const next = prev.map((m) =>
          m.id === activeMission.id
            ? { ...m, completed: true, starsEarned: Math.max(m.starsEarned, stars) }
            : m
        );
        localStorage.setItem('cpm_missions', JSON.stringify(next));
        return next;
      });

      setShowSuccessModal({ mission: activeMission, stars });
    },
    [activeMission, playerMoney, playerXp]
  );

  // Next Mission
  const handleNextMission = useCallback(() => {
    if (!activeMission) return;
    const nextIdx = (activeMission.id % missions.length);
    const next = missions[nextIdx];
    setActiveMission(next);
    setShowSuccessModal(null);
  }, [activeMission, missions]);

  const handleRetryMission = useCallback(() => {
    setShowSuccessModal(null);
    if (activeMission) {
      // Re-trigger mission start
      setActiveMission({ ...activeMission });
    }
  }, [activeMission]);

  // Car Reset / Respawn
  const handleResetCar = useCallback(() => {
    if (activeMission) {
      setActiveMission({ ...activeMission });
    } else {
      // Default plaza respawn
      setActiveMission(null);
    }
    setDrivingInput((prev) => ({ ...prev, throttle: 0, brake: 0, steer: 0, gear: 'D' }));
  }, [activeMission]);

  // Multiplayer Chat Sender
  const handleSendChatMessage = useCallback((text: string) => {
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'Sen',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMsg]);

    // Generate responsive simulated reply from bot players
    setTimeout(() => {
      const bots = ['Burak_Drift', 'SpeedDemon', 'VIP_Emre'];
      const randomBot = bots[Math.floor(Math.random() * bots.length)];
      const replies = [
        'Harika sürüyorsun dostum!',
        'Arabanın egzoz sesi çok iyi!',
        'Bir dahaki tura ben de geliyorum.',
        'Hemen yanına geliyorum!',
      ];
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: randomBot,
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 1600);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 1. 3D Game Canvas / 2D High-Performance Fallback */}
      <ErrorBoundary>
        <GameView
          vehicleConfig={currentVehicle}
          drivingInput={drivingInput}
          activeMission={activeMission}
          cameraMode={cameraMode}
          timeOfDay={timeOfDay}
          weather={weather}
          gameMode={gameMode}
          onTelemetryUpdate={setTelemetry}
          onMissionComplete={handleMissionComplete}
        />
      </ErrorBoundary>

      {/* 2. Interactive In-Game HUD (Speedometer, Pedals, Controls, Radar) */}
      {gameMode !== 'garage' && (
        <HUD
          telemetry={telemetry}
          drivingInput={drivingInput}
          activeMission={activeMission}
          cameraMode={cameraMode}
          timeOfDay={timeOfDay}
          weather={weather}
          playerMoney={playerMoney}
          playerXp={playerXp}
          onInputChange={handleInputChange}
          onCameraChange={handleCameraChange}
          onTimeOfDayChange={handleTimeOfDayChange}
          onWeatherToggle={handleWeatherToggle}
          onOpenGarage={() => setGameMode('garage')}
          onOpenMissions={() => setShowMissionsModal(true)}
          onOpenMultiplayer={() => setShowMultiplayerModal(true)}
          onResetCar={handleResetCar}
        />
      )}

      {/* 3. Garage & Customization Mode */}
      {gameMode === 'garage' && (
        <GarageMenu
          vehicles={vehicles}
          currentVehicle={currentVehicle}
          playerMoney={playerMoney}
          onSelectVehicle={handleSelectVehicle}
          onUpdateVehicle={handleUpdateVehicle}
          onClose={() => setGameMode('free_roam')}
        />
      )}

      {/* 4. Parking Missions Modal */}
      {showMissionsModal && (
        <MissionsModal
          missions={missions}
          activeMission={activeMission}
          onSelectMission={handleSelectMission}
          onFreeRoam={handleFreeRoam}
          onClose={() => setShowMissionsModal(false)}
        />
      )}

      {/* 5. Multiplayer Room Modal */}
      {showMultiplayerModal && (
        <MultiplayerModal
          players={onlinePlayers}
          chatMessages={chatMessages}
          onSendMessage={handleSendChatMessage}
          onClose={() => setShowMultiplayerModal(false)}
        />
      )}

      {/* 6. Parking Mission Success Modal */}
      {showSuccessModal && (
        <MissionSuccessModal
          mission={showSuccessModal.mission}
          stars={showSuccessModal.stars}
          onNextMission={handleNextMission}
          onRetry={handleRetryMission}
          onClose={() => setShowSuccessModal(null)}
        />
      )}
    </div>
  );
}
