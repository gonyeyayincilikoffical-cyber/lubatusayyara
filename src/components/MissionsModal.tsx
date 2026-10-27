import React from 'react';
import { ParkingMission } from '../types';
import { Trophy, Star, X, Play, Award, CheckCircle2 } from 'lucide-react';

interface MissionsModalProps {
  missions: ParkingMission[];
  activeMission: ParkingMission | null;
  onSelectMission: (m: ParkingMission) => void;
  onFreeRoam: () => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  activeMission,
  onSelectMission,
  onFreeRoam,
  onClose,
}) => {
  return (
    <div
      id="missions-modal-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-900/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-racing font-bold text-white uppercase tracking-wider">
                Otopark Görevleri
              </h2>
              <p className="text-xs text-slate-400">Hassas park etme manevralarını tamamla, para ve yıldız kazan!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Roam Quick Button */}
        <div className="px-5 pt-4">
          <button
            id="free-roam-mode-btn"
            onClick={onFreeRoam}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold transition shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-white" />
              <span className="text-sm font-racing">SERBEST ŞEHİR GEZİSİ (FREE ROAM)</span>
            </div>
            <span className="text-xs text-sky-200 font-normal">Sınırsız sürüş & drift</span>
          </button>
        </div>

        {/* Missions List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {missions.map((m) => {
            const isActive = activeMission?.id === m.id;
            return (
              <div
                key={m.id}
                id={`mission-card-${m.id}`}
                className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-racing font-bold text-sm text-white">{m.titleTr}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        m.difficulty === 'Kolay'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                          : m.difficulty === 'Orta'
                          ? 'bg-sky-950 text-sky-400 border border-sky-700/50'
                          : m.difficulty === 'Zor'
                          ? 'bg-amber-950 text-amber-400 border border-amber-700/50'
                          : 'bg-rose-950 text-rose-400 border border-rose-700/50'
                      }`}
                    >
                      {m.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{m.descriptionTr}</p>

                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-amber-400 font-racing font-bold">+₺{m.rewardMoney.toLocaleString()}</span>
                    <span className="text-sky-400 font-semibold">+{m.rewardXp} XP</span>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= m.starsEarned
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  id={`start-mission-${m.id}-btn`}
                  onClick={() => onSelectMission(m)}
                  className={`px-4 py-2.5 rounded-xl font-racing font-bold text-xs flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isActive ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'SEÇİLİ' : 'BAŞLAT'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
