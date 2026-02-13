import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../../supabase';
import { Language, translations } from '../i18n';

import CommentList, { Comment } from './CommentList';
import CommentForm from './CommentForm';
import * as style from './styles.css';
import 'add-css:./styles.css';

interface FeedbackProps {
    onBack?: () => void;
    lang: Language;
}

const PAGE_SIZE = 20;
const LIKES_STORAGE_KEY = 'pixkee-likes';

// 从 localStorage 读取点赞数据
function getLocalLikes(): Record<string, number> {
    try {
        const raw = localStorage.getItem(LIKES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function saveLocalLikes(likes: Record<string, number>) {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
}

export default function Feedback({ onBack, lang }: FeedbackProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [localLikes, setLocalLikes] = useState<Record<string, number>>(getLocalLikes());
    const t = translations[lang].feedback;

    const totalPages = Math.max(1, Math.ceil(comments.length / PAGE_SIZE));
    const paginatedComments = comments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const goToPage = (page: number) => {
        const p = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(p);
        const section = document.querySelector('.' + style.commentsSection);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    useEffect(() => {
        loadComments();
    }, []);

    // Sort by day (descending), then by likes (descending) within the same day
    const sortComments = (comments: Comment[]): Comment[] => {
        return comments.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);

            // Compare Date (Year-Month-Day)
            const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
            const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();

            if (dayA !== dayB) return dayB - dayA;

            // Same Day: Compare Likes
            if (a.likes !== b.likes) return b.likes - a.likes;

            // Same Day & Same Likes: Fallback to timestamp descending (newest first)
            return b.timestamp - a.timestamp;
        });
    };

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('pixkee_comments')
                .select('*')
            // Remove ordering by timestamp to allow custom sorting below
            // .order('timestamp', { ascending: false }); // We do custom sort anyway

            if (error) throw error;

            if (data) {
                const savedLikes = getLocalLikes();
                let mapped: Comment[] = data.map((item: any) => ({
                    ...item,
                    id: item.id.toString(),
                    // 合并 DB 的 likes 和本地的额外 likes
                    likes: (item.likes || 0) + (savedLikes[item.id.toString()] || 0),
                    isLiked: !!savedLikes[item.id.toString()],
                    replies: item.replies || []
                }));

                // Sort the comments: Newest Month -> Most Likes -> Newest Time
                mapped = sortComments(mapped);

                setComments(mapped);
            }
        } catch (e) {
            console.error('Failed to load comments', e);
        } finally {
            setLoading(false);
        }
    };

    // 插入新评论到数据库
    const addComment = async (comment: Comment) => {
        const { error } = await supabase.from('pixkee_comments').insert({
            content: comment.content,
            image: comment.image,
            timestamp: comment.timestamp,
            likes: 0,
            replies: []
        });
        if (!error) {
            await loadComments();
            setCurrentPage(1); // 跳回第一页看新评论
        }
    };

    const handlePost = async (content: string, image: File | null) => {
        let imageBase64: string | undefined;
        if (image) {
            imageBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(image);
            });
        }

        const newComment: Comment = {
            id: 'temp',
            content,
            image: imageBase64,
            timestamp: Date.now(),
            likes: 0,
            replies: []
        };

        await addComment(newComment);
    };

    // 点赞：使用 localStorage 持久化（因为 Supabase RLS 阻止 UPDATE）
    const handleLike = async (commentId: string) => {
        const saved = getLocalLikes();
        if (saved[commentId]) return; // 已经点过赞了

        // 记录到 localStorage
        saved[commentId] = 1;
        saveLocalLikes(saved);
        setLocalLikes({ ...saved });

        // 更新本地 UI 状态
        setComments(prev => prev.map(c =>
            c.id === commentId
                ? { ...c, likes: c.likes + 1, isLiked: true }
                : c
        ));
    };

    // 回复：作为新评论 INSERT 到 DB，内容带有引用格式
    const handleReply = async (commentId: string, content: string, image: File | null) => {
        // 找到被回复的评论内容，截取前 30 字作为引用
        const parentComment = comments.find(c => c.id === commentId);
        const parentPreview = parentComment
            ? parentComment.content.slice(0, 30) + (parentComment.content.length > 30 ? '...' : '')
            : '';

        const replyContent = `💬 Re: "${parentPreview}"\n\n${content}`;

        let imageBase64: string | undefined;
        if (image) {
            imageBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(image);
            });
        }

        const { error } = await supabase.from('pixkee_comments').insert({
            content: replyContent,
            image: imageBase64,
            timestamp: Date.now(),
            likes: 0,
            replies: []
        });

        if (!error) {
            await loadComments();
            setCurrentPage(1);
        }
    };

    return (
        <div class={style.feedbackContainer}>
            <div class={style.maxWidth}>
                <header class={style.header}>
                    {onBack && (
                        <button onClick={onBack} class={style.backButton}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}
                    <div>
                        <h1 class={style.title}>{t.title}</h1>
                        <p class={style.subtitle}>{t.subtitle}</p>
                    </div>
                </header>

                <CommentForm
                    onSubmit={handlePost}
                    placeholder={t.placeholder}
                    lang={lang}
                />

                <div class={style.commentsSection}>
                    <h2 class={style.sectionTitle}>
                        {t.latestComments} ({comments.length})
                    </h2>

                    {loading ? (
                        <div class={style.loading}>{t.loading}</div>
                    ) : (
                        <div>
                            <CommentList
                                comments={paginatedComments}
                                onLike={handleLike}
                                onReply={handleReply}
                                lang={lang}
                            />
                            {totalPages > 1 && (
                                <div class={style.pagination}>
                                    <button
                                        class={style.pageButton}
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        ‹
                                    </button>
                                    {getPageNumbers().map((p, i) =>
                                        typeof p === 'string' ? (
                                            <span key={`ellipsis-${i}`} class={style.pageEllipsis}>…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                class={p === currentPage ? style.pageButtonActive : style.pageButton}
                                                onClick={() => goToPage(p)}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                    <button
                                        class={style.pageButton}
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        ›
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

