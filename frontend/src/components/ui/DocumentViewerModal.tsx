import { Modal } from './Modal';
import { ExternalLink, Download } from 'lucide-react';
import { formatFileUrl } from '@/lib/utils';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentUrl: string | null;
    documentTitle: string;
}

export function DocumentViewerModal({ isOpen, onClose, documentUrl, documentTitle }: DocumentViewerModalProps) {
    const formattedUrl = documentUrl ? formatFileUrl(documentUrl) : '';
    const isPdf = formattedUrl.toLowerCase().split('?')[0].endsWith('.pdf');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={documentTitle} size="xl">
            <div className="flex flex-col h-[70vh]">
                {!documentUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                        <ExternalLink className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">No document uploaded</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end gap-2 mb-4 shrink-0">
                            <a
                                href={formattedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-cyan-500/20 hover:text-cyan-400"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open in New Tab
                            </a>
                            <a
                                href={formattedUrl}
                                download
                                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-violet-500/20 hover:text-violet-400"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </div>

                        <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                            {isPdf ? (
                                <iframe
                                    src={formattedUrl}
                                    className="w-full h-full"
                                    title={documentTitle}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-950 overflow-auto">
                                    <img
                                        src={formattedUrl}
                                        alt={documentTitle}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
