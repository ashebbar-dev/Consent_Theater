import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileJson, Play, Link, Loader } from 'lucide-react';

interface DataUploaderProps {
    onFileUpload: (file: File) => void;
    onLoadSample: () => void;
    onLoadFromUrl?: (url: string) => Promise<void>;
    isLoaded: boolean;
    isLoadingUrl?: boolean;
    urlError?: string | null;
}

export default function DataUploader({
    onFileUpload,
    onLoadSample,
    onLoadFromUrl,
    isLoaded,
    isLoadingUrl,
    urlError,
}: DataUploaderProps) {
    const [scannerUrl, setScannerUrl] = useState('');

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.json')) {
                onFileUpload(file);
            }
        },
        [onFileUpload]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileUpload(file);
            }
        },
        [onFileUpload]
    );

    const handleUrlFetch = useCallback(() => {
        if (scannerUrl.trim() && onLoadFromUrl) {
            onLoadFromUrl(scannerUrl.trim());
        }
    }, [scannerUrl, onLoadFromUrl]);

    if (isLoaded) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-4"
        >
            <div className="text-center">
                <h2 className="text-4xl font-bold text-theater-text mb-3">
                    🎭 Welcome to Consent Theater
                </h2>
                <p className="text-theater-muted text-lg max-w-xl">
                    Upload your scan results to begin the performance, or load sample data to explore.
                </p>
            </div>

            {/* Upload zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative w-full max-w-lg border-2 border-dashed border-theater-border rounded-2xl p-12 text-center hover:border-theater-accent transition-colors cursor-pointer group"
            >
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 text-theater-muted mx-auto mb-4 group-hover:text-theater-accent transition-colors" />
                <p className="text-theater-text font-medium text-lg">
                    Drop scan_result.json here
                </p>
                <p className="text-theater-muted text-sm mt-2">
                    or click to browse
                </p>
                <div className="flex items-center gap-2 justify-center mt-4 text-theater-muted text-xs">
                    <FileJson className="w-4 h-4" />
                    <span>Accepts JSON from the Consent Theater scanner app</span>
                </div>
            </div>

            {/* Fetch from Scanner URL */}
            {onLoadFromUrl && (
                <>
                    <div className="flex items-center gap-4 w-full max-w-lg">
                        <div className="flex-1 h-px bg-theater-border" />
                        <span className="text-theater-muted text-sm">or fetch from phone</span>
                        <div className="flex-1 h-px bg-theater-border" />
                    </div>

                    <div className="w-full max-w-lg">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theater-muted" />
                                <input
                                    type="text"
                                    placeholder="http://192.168.1.5:8080"
                                    value={scannerUrl}
                                    onChange={(e) => setScannerUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlFetch()}
                                    className="w-full pl-10 pr-4 py-3 bg-theater-bg border border-theater-border rounded-xl text-theater-text placeholder:text-theater-muted/50 focus:border-theater-accent focus:outline-none font-mono text-sm"
                                />
                            </div>
                            <motion.button
                                onClick={handleUrlFetch}
                                disabled={isLoadingUrl || !scannerUrl.trim()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-3 bg-theater-accent/20 border border-theater-accent/40 rounded-xl text-theater-accent font-medium hover:bg-theater-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoadingUrl ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Link className="w-4 h-4" />
                                )}
                                Fetch
                            </motion.button>
                        </div>
                        {urlError && (
                            <p className="text-red-400 text-sm mt-2 pl-1">
                                ⚠️ {urlError}
                            </p>
                        )}
                        <p className="text-theater-muted text-xs mt-2 pl-1">
                            Enter the URL shown on the scanner app's transfer screen
                        </p>
                    </div>
                </>
            )}

            {/* Separator */}
            <div className="flex items-center gap-4 w-full max-w-lg">
                <div className="flex-1 h-px bg-theater-border" />
                <span className="text-theater-muted text-sm">or</span>
                <div className="flex-1 h-px bg-theater-border" />
            </div>

            {/* Sample data button */}
            <motion.button
                onClick={onLoadSample}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-8 py-4 bg-theater-accent/20 border border-theater-accent/40 rounded-xl text-theater-accent font-medium hover:bg-theater-accent/30 transition-colors"
            >
                <Play className="w-5 h-5" />
                Load Sample Data (Demo Mode)
            </motion.button>
        </motion.div>
    );
}
