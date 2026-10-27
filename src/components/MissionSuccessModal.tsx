import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ParkingMission } from '../types';
import { Trophy, Star, ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';

interface MissionSuccessModalProps {
  mission: ParkingMission;
  stars: number;
  onNextMission: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export const MissionSuccessModal: React.FC<MissionSuccessModalProps> = ({
  mission,
  stars,
  onNextMission,
  onRetry,
  onClose,
}) => {
  useEffect(() => {
    // Fire festive celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  return (
    <div
      id="mission-success-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl w-full max-w-md p-6 flex flex-col items-center text-center shadow-2xl shadow-emerald-950/50">
        {/* Animated Check badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3">
          <CheckCircle className="w-9 h-9 text-emerald-400" />
        </div>

        <h2 className="text-xl font-racing font-bold text-white uppercase tracking-wider mb-1">
          KUSURSUZ PARK!
        </h2>
        <p className="text-xs text-slate-300 mb-4">{mission.titleTr} başarıyla tamamlandı!</p>

        {/* 3-Star Rating */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`p-2 rounded-2xl border transition-all transform ${
                s <= stars
                  ? 'bg-amber-950/50 border-amber-400 text-yellow-400 scale-110 shadow-lg shadow-amber-900/40'
                  : 'bg-slate-800/40 border-slate-700 text-slate-600'
              }`}
            >
              <Star className={`w-8 h-8 ${s <= stars ? 'fill-yellow-400' : ''}`} />
            </div>
          ))}
        </div>

        {/* Rewards Box */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-around mb-6">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Kazanılan Para</span>
            <span className="text-xl font-racing font-bold text-amber-400">+₺{mission.rewardMoney.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Kazanılan Tecrübe</span>
            <span className="text-xl font-racing font-bold text-sky-400">+{mission.rewardXp} XP</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col w-full gap-2.5">
          <button
            id="next-mission-btn"
            onClick={onNextMission}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-racing font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95"
          >
            <span>SONRAKİ GÖREV</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tekrar Dene</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Şehirde Kal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
