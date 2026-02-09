import { h } from 'preact';
import { useState } from 'preact/hooks';
import * as style from './styles.css';
import CommentForm from './CommentForm';
import { Language, translations } from '../i18n';

export interface Comment {
    id: string;
    content: string;
    image?: string;
    timestamp: number;
    likes: number;
    replies: Comment[];
    isLiked?: boolean;
}

interface CommentListProps {
    comments: Comment[];
    onLike: (commentId: string) => void;
    onReply: (commentId: string, content: string, image: File | null) => Promise<void>;
    lang: Language;
}

function CommentItem({ comment, onLike, onReply, depth = 0, lang }: { comment: Comment; onLike: (id: string) => void; onReply: (id: string, c: string, i: File | null) => Promise<void>; depth?: number, lang: Language }) {
    const [isReplying, setIsReplying] = useState(false);
    const t = translations[lang].feedback;

    const formatDate = (ts: number) => {
        const diff = Date.now() - ts;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return t.justNow;
        if (hours < 24) return `${hours} ${t.hoursAgo}`;
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div class={depth > 0 ? style.commentItemNested : style.commentItem}>
            <div class={style.avatar}>U</div>
            <div class={style.commentContent}>
                <div class={style.commentHeader}>
                    <span class={style.userName}>User</span>
                    <span class={style.timestamp}>{formatDate(comment.timestamp)}</span>
                </div>

                <div class={style.commentText}>{comment.content}</div>

                {comment.image && (
                    <img src={comment.image} alt="Attachment" class={style.commentImage} />
                )}

                <div class={style.commentActions}>
                    <button onClick={() => onLike(comment.id)} class={comment.isLiked ? style.actionButtonLiked : style.actionButton}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.isLiked ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span>{comment.likes || 0}</span>
                    </button>

                    <button onClick={() => setIsReplying(!isReplying)} class={style.actionButton}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{t.reply}</span>
                    </button>
                </div>

                {isReplying && (
                    <CommentForm
                        onSubmit={async (content, image) => {
                            await onReply(comment.id, content, image);
                            setIsReplying(false);
                        }}
                        placeholder={t.replyPlaceholder}
                        isReply
                        lang={lang}
                    />
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <div>
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} depth={depth + 1} lang={lang} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CommentList({ comments, onLike, onReply, lang }: CommentListProps) {
    const t = translations[lang].feedback;
    if (comments.length === 0) {
        return (
            <div class={style.emptyState}>
                <p>{t.noComments}</p>
            </div>
        );
    }

    return (
        <div>
            {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} onLike={onLike} onReply={onReply} lang={lang} />
            ))}
        </div>
    );
}
