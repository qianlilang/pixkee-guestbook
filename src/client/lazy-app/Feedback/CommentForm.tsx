import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import * as style from './styles.css';

interface CommentFormProps {
    onSubmit: (content: string, image: File | null) => Promise<void>;
    placeholder?: string;
    isReply?: boolean;
}

export default function CommentForm({ onSubmit, placeholder = "Share your thoughts...", isReply }: CommentFormProps) {
    const [content, setContent] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!content.trim() && !image) return;

        setIsSubmitting(true);
        await onSubmit(content, image);
        setIsSubmitting(false);
        setContent('');
        setImage(null);
    };

    const handleFileChange = (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            setImage(files[0]);
        }
    };

    const removeImage = () => {
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <form onSubmit={handleSubmit} class={isReply ? style.replyForm : style.commentForm}>
            <textarea
                value={content}
                onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                placeholder={placeholder}
                class={style.textarea}
            />

            {image && (
                <div class={style.imagePreview}>
                    <img
                        src={URL.createObjectURL(image)}
                        alt="Preview"
                        class={style.previewImg}
                    />
                    <button type="button" onClick={removeImage} class={style.removeImage}>
                        ✕
                    </button>
                </div>
            )}

            <div class={style.formActions}>
                <div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} class={style.iconButton}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21,15 16,10 5,21" />
                        </svg>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        class={style.hidden}
                        onChange={handleFileChange}
                    />
                </div>

                <button
                    type="submit"
                    disabled={(!content.trim() && !image) || isSubmitting}
                    class={style.submitButton}
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
}
