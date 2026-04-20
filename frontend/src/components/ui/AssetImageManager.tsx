import { useState, useEffect } from 'react';
import { Image, Trash2, Eye } from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';
import toast from 'react-hot-toast';

interface AssetImageManagerProps {
    imageUrl: string | null;
    assetName: string;
    onDelete: () => Promise<void>;
    onUploadChange: (file: File | null) => void;
}

export function AssetImageManager({ imageUrl, assetName, onDelete, onUploadChange }: AssetImageManagerProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    // Clean up local preview URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        };
    }, [localPreviewUrl]);

    // Reset local preview if the external imageUrl changes
    useEffect(() => {
        setLocalPreviewUrl(null);
    }, [imageUrl]);

    const fullImageUrl = imageUrl ? `${import.meta.env.VITE_API_URL}${imageUrl}` : null;
    const displayUrl = localPreviewUrl || fullImageUrl;

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete the existing image from the server?')) return;
        
        setDeleting(true);
        try {
            await onDelete();
            setLocalPreviewUrl(null); 
            onUploadChange(null);
            toast.success('Image deleted from server');
        } catch (error) {
            toast.error('Failed to delete image');
        } finally {
            setDeleting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onUploadChange(file);
        
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setLocalPreviewUrl(previewUrl);
        } else {
            setLocalPreviewUrl(null);
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">Asset Image</label>
            
            <div className="flex items-center gap-4">
                {/* Upload Input */}
                <div className="flex-1">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-400 hover:file:bg-cyan-500/20 focus:outline-none transition-colors"
                    />
                </div>

                {/* Preview Image */}
                {displayUrl ? (
                    <div className="relative group shrink-0">
                        <img 
                            src={displayUrl} 
                            alt={assetName || 'Asset preview'} 
                            className="h-12 w-12 rounded-lg object-cover ring-2 ring-white/10"
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-slate-900/80 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setViewerOpen(true); }}
                                className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                                title="View Image"
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                            {/* Only allow deleting the server image (not local preview) */}
                            {!localPreviewUrl && imageUrl && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="rounded p-1 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
                                    title="Delete from Server"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 ring-2 ring-white/5">
                        <Image className="h-5 w-5 text-slate-600" />
                    </div>
                )}
            </div>

            {/* Viewer Modal */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                documentUrl={displayUrl}
                documentTitle={`Image: ${assetName || 'Asset'}`}
            />
        </div>
    );
}
