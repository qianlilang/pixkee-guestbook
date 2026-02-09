import { h, Component, Fragment } from 'preact';
import * as style from './style.css';
import 'add-css:./style.css';
import JSZip from 'jszip';
import {
    decodeImage,
    preprocessImage,
    processImage,
    compressImage,
    SourceImage,
    processSvg,
} from '../util/pipeline';
import {
    defaultPreprocessorState,
    defaultProcessorState,
    encoderMap,
    EncoderState,
    ProcessorState,
    EncoderType,
} from '../feature-meta';
import WorkerBridge from '../worker-bridge';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import { Language, translations } from 'client/lazy-app/i18n';

interface Props {
    files: File[];
    showSnack: SnackBarElement['showSnackbar'];
    onBack: () => void;
    lang: Language;
}

interface FileStatus {
    file: File;
    id: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    originalSize: number;
    compressedSize: number;
    compressedFile?: File;
    thumbnailUrl?: string;
    error?: string;
}

interface State {
    items: FileStatus[];
    globalProgress: {
        processed: number;
        total: number;
    };
    isZipping: boolean;
    targetEncoder: EncoderType;
}

export default class Batch extends Component<Props, State> {
    private workerBridge = new WorkerBridge();
    private abortController = new AbortController();

    constructor(props: Props) {
        super(props);
        this.state = {
            items: props.files.map((file) => ({
                file,
                id: Math.random().toString(36).substr(2, 9),
                status: 'pending',
                originalSize: file.size,
                compressedSize: 0,
            })),
            globalProgress: {
                processed: 0,
                total: props.files.length,
            },
            isZipping: false,
            targetEncoder: 'webP',
        };
    }

    componentDidMount() {
        this.processQueue();
    }

    componentWillUnmount() {
        this.abortController.abort();
    }

    private async processQueue() {
        const { items } = this.state;
        // Process one by one to avoid memory issues
        for (const item of items) {
            if (this.abortController.signal.aborted) break;
            await this.processItem(item.id);
        }
    }

    private async processItem(id: string) {
        const itemIndex = this.state.items.findIndex((i) => i.id === id);
        if (itemIndex === -1) return;

        this.updateItemStatus(itemIndex, { status: 'processing' });

        try {
            const item = this.state.items[itemIndex];
            const signal = this.abortController.signal;

            // 1. Decode
            let decoded: ImageData;
            let vectorImage: HTMLImageElement | undefined;

            if (item.file.type.startsWith('image/svg+xml')) {
                vectorImage = await processSvg(signal, item.file);
                // Create thumbnail from SVG
                const canvas = document.createElement('canvas');
                canvas.width = 80;
                canvas.height = 80;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(vectorImage, 0, 0, 80, 80);
                this.updateItemStatus(itemIndex, { thumbnailUrl: canvas.toDataURL() });
                // For processing, we decode it
                // Note: In real app we might want to just optimize SVG text but here we convert to PNG like single mode often does or just optimize if supported
                // For simplicity/safety in this batch v1, we'll rasterize SVGs to PNGs if we compress them
                // But let's check pipeline.
                // Pipeline helper decodeImage doesn't handle SVG vector to ImageData conversion directly except via drawableToImageData
                // Let's reuse decodeImage logic which handles most types
            }

            // decodeImage helper from pipeline
            decoded = await decodeImage(signal, item.file, this.workerBridge); // This will handle formats

            // Generate thumbnail if not SVG
            if (!vectorImage) {
                const thumbCanvas = document.createElement('canvas');
                const aspect = decoded.width / decoded.height;
                thumbCanvas.width = 80;
                thumbCanvas.height = 80 / aspect;
                const ctx = thumbCanvas.getContext('2d')!;
                const iBitmap = await createImageBitmap(decoded);
                ctx.drawImage(iBitmap, 0, 0, thumbCanvas.width, thumbCanvas.height);
                this.updateItemStatus(itemIndex, { thumbnailUrl: thumbCanvas.toDataURL() });
            }

            // 2. Preprocess (Auto rotate etc)
            const preprocessed = await preprocessImage(
                signal,
                decoded,
                defaultPreprocessorState,
                this.workerBridge,
            );

            // 3. Process (Resize etc - default off)
            const source: SourceImage = {
                file: item.file,
                decoded,
                preprocessed,
                vectorImage,
            };

            // Aggressive compression settings to match "George the Panda" / TinyPNG results
            // Aggressive compression settings to match "George the Panda" / TinyPNG results
            let encoderSettings: EncoderState;
            let processorSettings: ProcessorState = { ...defaultProcessorState };
            const { targetEncoder } = this.state;

            // Apply specific processor settings if needed (e.g. quantization for PNG-like)
            if (targetEncoder === 'oxiPNG' || targetEncoder === 'browserPNG') {
                processorSettings = {
                    ...defaultProcessorState,
                    quantize: {
                        enabled: true,
                        zx: 0,
                        maxNumColors: 128,
                        dither: 1.0,
                    },
                };
            }

            // Get default options for the selected encoder
            // @ts-ignore
            const defaultOptions = encoderMap[targetEncoder].meta.defaultOptions;

            encoderSettings = {
                type: targetEncoder,
                options: { ...defaultOptions },
            } as EncoderState;

            // Override specific defaults if needed to match "Aggressive" behavior
            if (targetEncoder === 'webP') {
                // @ts-ignore
                encoderSettings.options.quality = 75;
            } else if (targetEncoder === 'mozJPEG') {
                // @ts-ignore
                encoderSettings.options.quality = 75;
            }

            const processed = await processImage(
                signal,
                source,
                processorSettings,
                this.workerBridge,
            );

            // 4. Compress
            const compressedFile = await compressImage(
                signal,
                processed,
                encoderSettings,
                item.file.name,
                this.workerBridge,
            );

            this.updateItemStatus(itemIndex, {
                status: 'done',
                compressedSize: compressedFile.size,
                compressedFile,
            });

            this.setState((state) => ({
                globalProgress: {
                    ...state.globalProgress,
                    processed: state.globalProgress.processed + 1,
                },
            }));
        } catch (err) {
            console.error(err);
            this.updateItemStatus(itemIndex, {
                status: 'error',
                error: err instanceof Error ? err.message : 'Compression failed'
            });
            this.setState((state) => ({
                globalProgress: {
                    ...state.globalProgress,
                    processed: state.globalProgress.processed + 1,
                },
            }));
        }
    }

    private updateItemStatus(index: number, update: Partial<FileStatus>) {
        this.setState((state) => {
            const newItems = [...state.items];
            newItems[index] = { ...newItems[index], ...update };
            return { items: newItems };
        });
    }

    private formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private downloadFile(file: File) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private downloadAll = async () => {
        this.setState({ isZipping: true });
        try {
            const zip = new JSZip();

            const doneItems = this.state.items.filter(
                i => i.status === 'done' && i.compressedFile
            );

            doneItems.forEach(item => {
                zip.file(item.compressedFile!.name, item.compressedFile!);
            });

            const content = await zip.generateAsync({ type: 'blob' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'pixkee-optimized-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            this.props.showSnack('Failed to create ZIP');
        } finally {
            this.setState({ isZipping: false });
        }
    }

    render({ onBack, lang }: Props, { items, globalProgress, isZipping }: State) {
        const t = translations[lang].batch;
        const totalOriginal = items.reduce((acc, i) => acc + i.originalSize, 0);
        const totalCompressed = items.reduce((acc, i) => acc + (i.compressedFile ? i.compressedSize : i.originalSize), 0);
        const totalSaved = totalOriginal - totalCompressed;
        const percentage = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

        const isFinished = globalProgress.processed === globalProgress.total;

        return (
            <div class={style.batch}>
                <header class={style.header}>
                    <div class={style.headerLeft}>
                        <div class={style.titleMain}>
                            {globalProgress.processed < globalProgress.total
                                ? t.optimizing
                                : percentage > 0
                                    ? `${t.saved} ${percentage}%`
                                    : t.complete}
                        </div>
                        <div class={style.titleSub}>
                            {items.length} {t.optimized} | {this.formatSize(totalCompressed)} {t.total}
                        </div>
                    </div>

                    <div class={style.headerCenter}>
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>{t.format}</span>
                        <select
                            value={this.state.targetEncoder}
                            onChange={(e) => {
                                const newEncoder = (e.target as HTMLSelectElement).value as EncoderType;
                                this.setState({ targetEncoder: newEncoder });
                                // Reset items to pending and re-process
                                // Note: In a real app we might want to only re-process done items or better yet, proper queue management.
                                // For this v1 simple batch, we'll just reload the page or we could reset logic.
                                // But simply changing state won't re-trigger processQueue for already done items in current logic.
                                // Let's just allow changing for *next* or if we want to re-process we need to reset status.
                                // IMPORTANT: Current processQueue runs ONCE on mount.
                                // We should probably expose a way to restart or just accept this format is for *new* uploads if we were following strict flow.
                                // BUT, for a better UX, let's reset and re-process.
                                this.setState(prev => ({
                                    globalProgress: { processed: 0, total: prev.items.length },
                                    items: prev.items.map(i => ({
                                        ...i,
                                        status: 'pending',
                                        compressedSize: 0,
                                        compressedFile: undefined,
                                        error: undefined
                                    }))
                                }), () => {
                                    this.abortController.abort(); // Stop current
                                    this.abortController = new AbortController(); // New controller
                                    this.processQueue(); // Restart
                                });
                            }}
                            style={{
                                background: '#1e1e1e',
                                color: '#e5e7eb',
                                border: '1px solid #374151',
                                borderRadius: '0.375rem',
                                padding: '4px 8px',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="webP">{encoderMap.webP.meta.label}</option>
                            <option value="mozJPEG">{encoderMap.mozJPEG.meta.label}</option>
                            <option value="oxiPNG">{encoderMap.oxiPNG.meta.label}</option>
                            <option value="avif">{encoderMap.avif.meta.label}</option>
                            <option value="jxl">{encoderMap.jxl.meta.label}</option>
                            <option value="wp2">{encoderMap.wp2.meta.label}</option>
                            <option value="qoi">{encoderMap.qoi.meta.label}</option>
                            <option value="browserPNG">{encoderMap.browserPNG.meta.label}</option>
                            <option value="browserJPEG">{encoderMap.browserJPEG.meta.label}</option>
                            <option value="browserGIF">{encoderMap.browserGIF.meta.label}</option>
                        </select>
                    </div>

                    <div class={style.headerActions}>
                        {isFinished && (
                            <button
                                class={style.downloadAllHeaderBtn}
                                onClick={this.downloadAll}
                                disabled={isZipping}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                {isZipping ? t.zipping : t.downloadAll}
                            </button>
                        )}
                        <button class={style.toolbarBtn} onClick={onBack} title="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </header>

                <div class={style.fileList}>
                    {items.map((item) => (
                        <div class={style.fileItem} key={item.id}>
                            {/* Thumbnail */}
                            {item.thumbnailUrl ? (
                                <img src={item.thumbnailUrl} class={style.thumbnail} />
                            ) : (
                                <div class={style.thumbnail} />
                            )}

                            {/* Info */}
                            <div class={style.fileInfo}>
                                <div class={style.fileName}>{item.file.name}</div>
                                <span class={style.formatBadge}>
                                    {item.compressedFile
                                        ? item.compressedFile.name.split('.').pop()
                                        : encoderMap[this.state.targetEncoder].meta.extension}
                                </span>
                                <span class={style.fileSizeOriginal}>{this.formatSize(item.originalSize)}</span>
                            </div>

                            {/* Stats & Actions */}
                            <div class={style.fileStats}>
                                {item.status === 'processing' ? (
                                    <div style={{ width: '150px' }}>
                                        <div class={style.processingBar}>
                                            <div class={style.processingBarInner}></div>
                                        </div>
                                    </div>
                                ) : item.status === 'error' ? (
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>{t.error}</span>
                                ) : (
                                    <Fragment>
                                        <div style={{ textAlign: 'right' }}>
                                            <div class={style.savingsPercent}>
                                                -{Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)}%
                                            </div>
                                            <span class={style.newSize}>
                                                {this.formatSize(item.compressedSize)}
                                            </span>
                                        </div>
                                        <button
                                            class={style.downloadItemBtn}
                                            onClick={() => this.downloadFile(item.compressedFile!)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                            {item.compressedFile ? item.compressedFile.name.split('.').pop()?.toUpperCase() : t.download}
                                        </button>
                                    </Fragment>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with duplicates of header actions for easy access */}
                <footer class={style.footer}>
                    <div class={style.headerActions}>
                        <button class={style.toolbarBtn} onClick={() => { /* Placeholder for DropBox */ }} title="Save to Dropbox">
                            {/* Dropbox Icon Placeholder - using a generic cloud for now */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </button>
                        <button class={style.toolbarBtn} onClick={onBack} title="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        {isFinished && (
                            <button
                                class={style.downloadAllHeaderBtn}
                                onClick={this.downloadAll}
                                disabled={isZipping}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                {isZipping ? t.zipping : t.downloadAll}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        );
    }
}
