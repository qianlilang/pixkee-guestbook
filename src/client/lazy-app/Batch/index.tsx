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
} from '../feature-meta';
import WorkerBridge from '../worker-bridge';
import type SnackBarElement from 'shared/custom-els/snack-bar';

interface Props {
    files: File[];
    showSnack: SnackBarElement['showSnackbar'];
    onBack: () => void;
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
            let encoderSettings: EncoderState;
            let processorSettings: ProcessorState = { ...defaultProcessorState };

            if (item.file.type === 'image/png') {
                // For PNG, we need quantization to get high compression ratios (lossy)
                processorSettings = {
                    ...defaultProcessorState,
                    quantize: {
                        enabled: true,
                        zx: 0,
                        maxNumColors: 128,
                        dither: 1.0,
                    },
                };
                encoderSettings = {
                    type: 'oxiPNG',
                    options: {
                        level: 2, // Standard
                        interlace: false,
                    },
                };
            } else if (item.file.type === 'image/webp') {
                encoderSettings = {
                    type: 'webP',
                    options: {
                        quality: 75,
                        target_size: 0,
                        target_PSNR: 0,
                        method: 4,
                        sns_strength: 50,
                        filter_strength: 60,
                        filter_sharpness: 0,
                        filter_type: 1,
                        partitions: 0,
                        segments: 4,
                        pass: 1,
                        show_compressed: 0,
                        preprocessing: 0,
                        autofilter: 0,
                        partition_limit: 0,
                        alpha_compression: 1,
                        alpha_filtering: 1,
                        alpha_quality: 100,
                        lossless: 0,
                        exact: 0,
                        image_hint: 0,
                        emulate_jpeg_size: 0,
                        thread_level: 0,
                        low_memory: 0,
                        near_lossless: 100,
                        use_delta_palette: 0,
                        use_sharp_yuv: 0,
                    },
                }
            } else {
                // JPEG
                encoderSettings = {
                    type: 'mozJPEG',
                    options: {
                        quality: 75,
                        baseline: false,
                        arithmetic: false,
                        progressive: true,
                        optimize_coding: true,
                        smoothing: 0,
                        color_space: 3, // JCS_YCbCr
                        quant_table: 3, // MSSIM
                        trellis_multipass: false,
                        trellis_opt_zero: false,
                        trellis_opt_table: false,
                        trellis_loops: 1,
                        auto_subsample: true,
                        chroma_subsample: 2,
                        separate_chroma_quality: false,
                        chroma_quality: 75,
                    },
                };
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

    render({ onBack }: Props, { items, globalProgress, isZipping }: State) {
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
                                ? 'Optimizing your images...'
                                : percentage > 0
                                    ? `Pixkee just saved you ${percentage}%`
                                    : 'Optimization complete'}
                        </div>
                        <div class={style.titleSub}>
                            {items.length} images optimized | {this.formatSize(totalCompressed)} TOTAL
                        </div>
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
                                {isZipping ? 'Zipping...' : 'Download all images'}
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
                                <span class={style.formatBadge}>{item.file.name.split('.').pop()}</span>
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
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Error</span>
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
                                            {item.file.name.split('.').pop()?.toUpperCase()}
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
                                {isZipping ? 'Zipping...' : 'Download all images'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        );
    }
}
