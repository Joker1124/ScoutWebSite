
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode; 
    confirmText?: string;
    cancelText?: string;
    isProcessing: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "نعم، تأكيد", cancelText = "إلغاء", isProcessing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-100 dark:border-red-900">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                    <AlertTriangle size={28} />
                </div>
                <h3 className="text-lg font-black text-center mb-2 dark:text-white">{title}</h3>
                <div className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">{message}</div>
                <div className="flex gap-3">
                    <button onClick={onConfirm} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-colors">
                        {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : confirmText}
                    </button>
                    <button onClick={onClose} disabled={isProcessing} className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl font-bold disabled:opacity-50">
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
