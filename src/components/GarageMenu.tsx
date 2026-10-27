import React, { useState } from 'react';
import { VehicleConfig, PaintFinish, RimStyle, SpoilerStyle } from '../types';
import {
  Palette,
  Disc,
  ArrowUpRight,
  Sliders,
  Gauge,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
} from 'lucide-react';

interface GarageMenuProps {
  vehicles: VehicleConfig[];
  currentVehicle: VehicleConfig;
  playerMoney: number;
  onSelectVehicle: (v: VehicleConfig) => void;
  onUpdateVehicle: (updated: VehicleConfig) => void;
  onClose: () => void;
}

type TabType = 'cars' | 'paint' | 'wheels' | 'aero' | 'tuning';

export const GarageMenu: React.FC<GarageMenuProps> = ({
  vehicles,
  currentVehicle,
  playerMoney,
  onSelectVehicle,
  onUpdateVehicle,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('paint');

  // Color presets
  const paintPresets = [
    '#0055ff', // Alpine Blue
    '#e11d48', // Crimson Red
    '#0f172a', // Obsidian Black
    '#f8fafc', // Pure White
    '#f59e0b', // Sunset Amber
    '#10b981', // Emerald Green
    '#8b5cf6', // Deep Purple
    '#06b6d4', // Cyan Neon
    '#475569', // Nardo Gray
    '#d97706', // Gold Bronze
  ];

  const rimColors = ['#e2e8f0', '#0f172a', '#f59e0b', '#dc2626', '#3b82f6', '#d97706'];

  const underglowColors = [
    { name: 'Kapalı', value: null },
    { name: 'Cyan Mavi', value: '#06b6d4' },
    { name: 'Neon Kırmızı', value: '#ef4444' },
    { name: 'Neon Yeşil', value: '#10b981' },
    { name: 'Neon Mor', value: '#a855f7' },
    { name: 'Altın Sarı', value: '#facc15' },
  ];

  const update = (patch: Partial<VehicleConfig>) => {
    const updated = { ...currentVehicle, ...patch };
    onUpdateVehicle(updated);
  };

  return (
    <div
      id="garage-menu-overlay"
      className="absolute inset-0 z-30 pointer-events-auto flex flex-col justify-between p-4 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/80 backdrop-blur-[2px]"
    >
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-racing font-bold text-white uppercase tracking-wider">
              {currentVehicle.name}
            </h1>
            <p className="text-xs text-sky-400 font-semibold">{currentVehicle.brand} • {currentVehicle.category}</p>
          </div>
        </div>

        {/* Action button to return to driving */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 text-amber-400 font-racing font-bold text-lg shadow-md">
            ₺ {playerMoney.toLocaleString()}
          </div>
          <button
            id="garage-drive-btn"
            onClick={onClose}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-racing font-bold px-6 py-2.5 rounded-xl shadow-lg transition active:scale-95 text-sm"
          >
            <span>ŞEHRE DÖN & SÜR</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BOTTOM CUSTOMIZATION PANEL */}
      <div className="max-w-4xl w-full mx-auto bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 overflow-x-auto">
          {[
            { id: 'cars', label: 'Araç Seçimi', icon: Disc },
            { id: 'paint', label: 'Boya & Kaplama', icon: Palette },
            { id: 'wheels', label: 'Jant & Süspansiyon', icon: Sliders },
            { id: 'aero', label: 'Spoiler & Gövde', icon: Sparkles },
            { id: 'tuning', label: 'Motor & Performans', icon: Gauge },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`garage-tab-${t.id}`}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Car Selection */}
        {activeTab === 'cars' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {vehicles.map((v) => {
              const isSelected = v.id === currentVehicle.id;
              return (
                <button
                  key={v.id}
                  id={`car-select-${v.id}`}
                  onClick={() => onSelectVehicle(v)}
                  className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 shadow-md ring-2 ring-sky-500/30'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-racing font-bold text-xs text-white truncate">{v.name}</span>
                  <span className="text-[10px] text-slate-400 mb-2">{v.category}</span>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-sky-400">
                    <span>{v.basePowerHp} HP</span>
                    <span>{v.driveType}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Paint & Finish */}
        {activeTab === 'paint' && (
          <div className="flex flex-col gap-4">
            {/* Color Palette */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Gövde Rengi</label>
              <div className="flex items-center gap-2 flex-wrap">
                {paintPresets.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => update({ bodyColor: hex })}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      currentVehicle.bodyColor.toLowerCase() === hex.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* Custom Color Input */}
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400">Özel:</span>
                  <input
                    type="color"
                    value={currentVehicle.bodyColor}
                    onChange={(e) => update({ bodyColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>

            {/* Finish Type */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Boya Tipi / Kaplama</label>
              <div className="grid grid-cols-4 gap-2">
                {(['gloss', 'metallic', 'matte', 'pearl'] as PaintFinish[]).map((finish) => (
                  <button
                    key={finish}
                    onClick={() => update({ finish })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border ${
                      currentVehicle.finish === finish
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {finish === 'gloss'
                      ? 'Parlak'
                      : finish === 'metallic'
                      ? 'Metalik'
                      : finish === 'matte'
                      ? 'Mat'
                      : 'Sedefli'}
                  </button>
                ))}
              </div>
            </div>

            {/* Window Tint */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Cam Filmi Koyu Tonu</span>
                <span className="text-sky-400">%{Math.round(currentVehicle.windowTint * 100)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.95"
                step="0.05"
                value={currentVehicle.windowTint}
                onChange={(e) => update({ windowTint: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Wheels & Suspension */}
        {activeTab === 'wheels' && (
          <div className="flex flex-col gap-4">
            {/* Rim Style */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Jant Modeli</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'sport', label: 'Sport 6-Kol' },
                  { id: 'deep_dish', label: 'Deep Dish Ofset' },
                  { id: 'mesh', label: 'Mesh Çok Kollu' },
                  { id: 'racing', label: 'Yarış Hafif' },
                  { id: 'luxury', label: 'VIP Çok Kollu' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => update({ rimStyle: r.id as RimStyle })}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition border ${
                      currentVehicle.rimStyle === r.id
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rim Color */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Jant Rengi</label>
              <div className="flex items-center gap-2">
                {rimColors.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => update({ rimColor: hex })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      currentVehicle.rimColor.toLowerCase() === hex.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {/* Sliders: Suspension Height & Camber */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Süspansiyon Yüksekliği (Basıklık)</span>
                  <span className="text-sky-400">{Math.round(currentVehicle.suspensionHeight * 100)} cm</span>
                </div>
                <input
                  type="range"
                  min="-0.07"
                  max="0.06"
                  step="0.01"
                  value={currentVehicle.suspensionHeight}
                  onChange={(e) => update({ suspensionHeight: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Kamber Açısı (Camber)</span>
                  <span className="text-sky-400">-{Math.round(Math.abs(currentVehicle.camberAngle) * 100)}°</span>
                </div>
                <input
                  type="range"
                  min="-0.14"
                  max="0.0"
                  step="0.01"
                  value={currentVehicle.camberAngle}
                  onChange={(e) => update({ camberAngle: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Aero & Underglow */}
        {activeTab === 'aero' && (
          <div className="flex flex-col gap-4">
            {/* Spoiler Styles */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Spoiler / Kanat Modeli</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'none', label: 'Yok (Orijinal)' },
                  { id: 'ducktail', label: 'Ducktail Lip' },
                  { id: 'gt_wing', label: 'Karbon GT Wing' },
                  { id: 'carbon_lip', label: 'Aero Lip' },
                  { id: 'hyper_dual', label: 'Hyper Aktif Kanat' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ spoilerStyle: s.id as SpoilerStyle })}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition border ${
                      currentVehicle.spoilerStyle === s.id
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Underglow Neon */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Alt Neon Işıklandırması</label>
              <div className="grid grid-cols-6 gap-2">
                {underglowColors.map((u) => {
                  const isSelected = currentVehicle.underglowColor === u.value;
                  return (
                    <button
                      key={u.name}
                      onClick={() => update({ underglowColor: u.value })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {u.value && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.value }} />
                      )}
                      <span>{u.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Engine Tuning & Performance */}
        {activeTab === 'tuning' && (
          <div className="flex flex-col gap-4">
            {/* Engine Stages */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">Motor Güç Kiti (Engine Stage)</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { stage: 1, label: 'Stock Fabrika', boost: '+0 HP' },
                  { stage: 2, label: 'Stage 1 Yazılım', boost: '+40 HP' },
                  { stage: 3, label: 'Stage 2 Twin Turbo', boost: '+110 HP' },
                  { stage: 4, label: 'Stage 3 Pro Race', boost: '+220 HP' },
                ].map((st) => (
                  <button
                    key={st.stage}
                    onClick={() => update({ engineStage: st.stage as 1 | 2 | 3 | 4 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      currentVehicle.engineStage === st.stage
                        ? 'bg-gradient-to-r from-sky-600 to-blue-700 border-sky-400 text-white shadow-lg'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{st.label}</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{st.boost}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drift Lock Angle */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Drift Direksiyon Dönüş Açısı (Lock Angle)</span>
                <span className="text-sky-400">{currentVehicle.driftAngleLock}°</span>
              </div>
              <input
                type="range"
                min="35"
                max="55"
                step="1"
                value={currentVehicle.driftAngleLock}
                onChange={(e) => update({ driftAngleLock: parseInt(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
