import React, { useState } from 'react';
import { OnlinePlayer, ChatMessage } from '../types';
import { Users, Send, MessageSquare, Signal, X, ShieldCheck } from 'lucide-react';

interface MultiplayerModalProps {
  players: OnlinePlayer[];
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  players,
  chatMessages,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');

  const quickMessages = [
    'Selam millet!',
    'Drift kapışalım mı?',
    'Aracın efsane olmuş!',
    'Beni takip edin!',
    'Benzinliğe gelin',
    'Otoparka park ediyoruz!',
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickSend = (msg: string) => {
    onSendMessage(msg);
  };

  return (
    <div
      id="multiplayer-modal-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2.5 rounded-2xl text-white shadow-lg shadow-purple-900/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-racing font-bold text-white uppercase tracking-wider">
                  Online Multiplayer Oda #01
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  CANLI ({players.length + 1} Sürücü)
                </span>
              </div>
              <p className="text-xs text-slate-400">Şehir haritasında diğer oyuncularla serbestçe sür, sohbet et ve yarış!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Split view - Left: Players, Right: Chat */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Players List */}
          <div className="w-full md:w-72 border-r border-slate-800 p-4 overflow-y-auto bg-slate-950/40 flex flex-col gap-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Aktif Oyuncular</span>
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* Local Player (You) */}
            <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>Sen (Sürücü)</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-[10px] text-sky-300">Oda Sahibi</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">12 ms</span>
            </div>

            {/* Other Online Players */}
            {players.map((p) => (
              <div
                key={p.id}
                className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.statusText || 'Şehirde Geziyor'}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{p.pingMs} ms</span>
              </div>
            ))}
          </div>

          {/* Chat Feed & Quick Chat */}
          <div className="flex-1 flex flex-col justify-between bg-slate-900/60">
            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                    msg.isSystem
                      ? 'bg-purple-950/40 border border-purple-800/40 text-purple-200 mx-auto text-center'
                      : msg.sender === 'Sen'
                      ? 'bg-sky-600 text-white ml-auto'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-200'
                  }`}
                >
                  {!msg.isSystem && (
                    <div className="flex items-center justify-between gap-2 font-bold mb-0.5 text-[11px] opacity-90">
                      <span>{msg.sender}</span>
                      <span className="text-[9px] font-normal opacity-70">{msg.time}</span>
                    </div>
                  )}
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Quick Messages Wheel */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/50 flex gap-1.5 overflow-x-auto">
              {quickMessages.map((qm, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickSend(qm)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
                >
                  {qm}
                </button>
              ))}
            </div>

            {/* Custom Input Box */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Mesaj yazın..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gönder</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
