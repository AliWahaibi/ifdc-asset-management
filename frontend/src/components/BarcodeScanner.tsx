import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertTriangle } from 'lucide-react';

interface BarcodeScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (error: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onScanError, onClose }) => {
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        try {
            scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.QR_CODE,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                    ]
                },
                /* verbose= */ false
            );

            const successCallback = (decodedText: string) => {
                scanner?.clear().then(() => {
                    onScanSuccess(decodedText);
                }).catch(error => {
                    console.error("Failed to clear scanner", error);
                    onScanSuccess(decodedText);
                });
            };

            const errorCallback = (errorMessage: string) => {
                // Only forward non-transient scan errors
                if (onScanError) onScanError(errorMessage);
            };

            scanner.render(successCallback, errorCallback);
        } catch (err: any) {
            const errorMsg = err?.message || String(err);
            
            if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
                setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
            } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('no camera')) {
                setCameraError('No camera found on this device. Please connect a camera and try again.');
            } else if (errorMsg.includes('insecure') || errorMsg.includes('https')) {
                setCameraError('Camera access requires a secure connection (HTTPS). Please access this page over HTTPS to use the scanner.');
            } else {
                setCameraError(`Scanner initialization failed: ${errorMsg}`);
            }
        }

        return () => {
            scanner?.clear().catch(err => console.error("Scanner cleanup error", err));
        };
    }, [onScanSuccess, onScanError]);

    if (cameraError) {
        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                        <AlertTriangle className="h-6 w-6 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-bold text-amber-300 mb-1">Camera Unavailable</h3>
                    <p className="text-xs text-amber-400/80 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div id="reader" className="overflow-hidden rounded-xl border border-slate-700 bg-black"></div>
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                    Cancel Scan
                </button>
            </div>
            <p className="text-center text-xs text-slate-500 italic">Point your camera at a barcode or QR code.</p>
        </div>
    );
};
