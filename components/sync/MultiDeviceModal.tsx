'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Radio,
  Wifi,
  RefreshCw,
  ArrowRightLeft,
  Check,
  Copy,
  QrCode,
  ShieldCheck,
  Battery,
  MapPin,
  X,
  Play,
  Server,
} from 'lucide-react';
import { useMultiDeviceSync } from '@/hooks/useMultiDeviceSync';
import { DeviceInfo, DeviceType } from '@/types/sync';

interface MultiDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDeviceIcon(type: DeviceType) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="w-5 h-5 text-blue-400" />;
    case 'tablet':
      return <Tablet className="w-5 h-5 text-purple-400" />;
    case 'desktop':
    default:
      return <Laptop className="w-5 h-5 text-emerald-400" />;
  }
}

export function MultiDeviceModal({ isOpen, onClose }: MultiDeviceModalProps) {
  const {
    deviceId,
    devices,
    isAutoSync,
    toggleAutoSync,
    incomingTransfer,
    acceptTransfer,
    dismissTransfer,
    transferToDevice,
    refreshDevices,
    isSyncing,
  } = useMultiDeviceSync();

  const [copiedPairing, setCopiedPairing] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.id === deviceId);
  const otherDevices = devices.filter((d) => d.id !== deviceId);

  const pairingCode = 'CI-7482';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopiedPairing(true);
    setTimeout(() => setCopiedPairing(false), 2000);
  };

  const handleTransfer = async (targetId: string) => {
    setTransferTargetId(targetId);
    await transferToDevice(targetId);
    setTimeout(() => setTransferTargetId(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Synchronisation Multi-Appareils
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NestJS Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuité de lecture instantanée • Handoff 1-clic entre Mobile & PC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshDevices()}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Rafraîchir les appareils"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Incoming Transfer Alert */}
          {incomingTransfer && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/50 shadow-lg animate-in slide-in-from-top duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/30 text-blue-300 rounded-xl">
                    <ArrowRightLeft className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                      Transfert de lecture entrant
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {incomingTransfer.sourceDeviceName} vous transfère la lecture
                    </div>
                    {incomingTransfer.playbackState?.trackTitle && (
                      <div className="text-xs text-blue-300 mt-0.5">
                        « {incomingTransfer.playbackState.trackTitle} » (
                        {Math.floor(incomingTransfer.playbackState.currentTime / 60)}:
                        {String(Math.floor(incomingTransfer.playbackState.currentTime % 60)).padStart(2, '0')}
                        )
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptTransfer(incomingTransfer)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Reprendre ici</span>
                  </button>
                  <button
                    onClick={dismissTransfer}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Device Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                  {getDeviceIcon(currentDevice?.type || 'desktop')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {currentDevice?.name || 'Cet Appareil'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Cet appareil
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {currentDevice?.location || 'Abidjan 🇨🇮'}
                    </span>
                    <span>•</span>
                    <span>{currentDevice?.browser}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-emerald-400">En ligne</span>
              </div>
            </div>
          </div>

          {/* Other Connected Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-blue-400" />
                Appareils Connectés Disponibles ({otherDevices.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Handoff audio sans coupure
              </span>
            </div>

            <div className="space-y-2.5">
              {otherDevices.map((dev) => {
                const isTransferringThis = transferTargetId === dev.id;
                return (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
                        {getDeviceIcon(dev.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{dev.name}</span>
                          {dev.batteryLevel !== undefined && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                              <Battery className="w-3 h-3 text-emerald-400" />
                              {dev.batteryLevel}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{dev.location || 'Côte d’Ivoire 🇨🇮'}</span>
                          <span>•</span>
                          <span>{dev.platform}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTransfer(dev.id)}
                      disabled={isSyncing || isTransferringThis}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isTransferringThis
                          ? 'bg-emerald-600 text-white shadow-lg'
                          : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30'
                      }`}
                    >
                      <ArrowRightLeft className={`w-3.5 h-3.5 ${isTransferringThis ? 'animate-spin' : ''}`} />
                      <span>
                        {isTransferringThis ? 'Transféré !' : 'Transférer la lecture'}
                      </span>
                    </button>
                  </div>
                );
              })}

              {otherDevices.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Aucun autre appareil détecté. Ouvrez l&apos;application sur votre mobile ou un autre navigateur pour l&apos;apparier instantanément.
                </div>
              )}
            </div>
          </div>

          {/* Quick Pairing & Auto-Sync Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Auto-Sync Toggle Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Auto-Sync État & EQ</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Synchronise en continu la file d&apos;attente et les réglages DSP
                </div>
              </div>
              <button
                onClick={toggleAutoSync}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAutoSync ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAutoSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Fast Pairing Code Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Code de Jumelage Rapide</div>
                <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                  {pairingCode}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowQr((prev) => !prev)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Afficher le QR code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="Copier le code"
                >
                  {copiedPairing ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* QR Code expansion */}
          {showQr && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95">
              <div className="p-3 bg-white rounded-xl shadow-lg">
                {/* SVG QR Code Simulation */}
                <div className="w-32 h-32 bg-slate-900 flex flex-col items-center justify-center p-2 rounded text-slate-300 font-mono text-[9px] text-center">
                  <QrCode className="w-16 h-16 text-slate-200 mb-1" />
                  <span>Scan mobile</span>
                  <span className="text-emerald-400 font-bold">{pairingCode}</span>
                </div>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Scannez avec l&apos;application React Native / Expo ou Chrome Mobile
              </div>
            </div>
          )}

          {/* Architecture Badge */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <Server className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              <strong>Architecture NestJS & REST :</strong> Les contrôleurs NestJS gèrent l&apos;horloge vectorielle pour la résolution de conflits et le routage des handoffs multi-sessions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
