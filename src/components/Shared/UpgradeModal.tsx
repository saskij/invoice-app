import React from 'react';
import { Crown, Check, X, Zap, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCount?: number;
    limit?: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentCount = 5, limit = 5 }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
                {/* Premium Header Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-20 blur-3xl"></div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>

                <div className="p-10 relative">
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 animate-bounce-subtle">
                            <Crown className="text-white w-10 h-10" />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-extrabold text-white mb-4">You've reached your limit!</h2>
                        <p className="text-lg text-slate-300">
                            You've sent <span className="text-white font-bold">{currentCount} of {limit}</span> free invoices.
                            Upgrade to <span className="text-amber-400 font-bold">Pro</span> to unlock unlimited growth.
                        </p>
                    </div>

                    <div className="grid gap-4 mb-10">
                        {[
                            'Unlimited Invoices & Clients',
                            'Custom Branding & Logo',
                            'Automated Payment Reminders',
                            'Advanced Analytics & Reports',
                            'Priority Support'
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-xl border border-white/5 transition-transform hover:scale-[1.02]">
                                <div className="p-1.5 bg-emerald-500/20 rounded-full">
                                    <Check className="text-emerald-400 w-4 h-4" />
                                </div>
                                <span className="text-slate-200 font-medium">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-3 text-lg group"
                        >
                            Get Pro Monthly — $19/mo
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-center text-sm text-slate-500">
                            No commitment. Cancel anytime.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
