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

const STORAGE_KEY = 'pixkee-comments';
const PAGE_SIZE = 20;

export default function Feedback({ onBack, lang }: FeedbackProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const t = translations[lang].feedback;

    const totalPages = Math.max(1, Math.ceil(comments.length / PAGE_SIZE));
    const paginatedComments = comments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const goToPage = (page: number) => {
        const p = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(p);
        // scroll to top of comments section
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

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('pixkee_comments')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                throw error;
            }

            if (data) {
                // Ensure replies is parsed if it comes as string, though Supabase handles JSON types well.
                // Our schema has replies as jsonb, so it should be fine.
                // We might need to map data to match Comment interface if field names differ, 
                // but we designed the schema to match.
                // Wait, our schema uses 'id' as bigint (generated), but frontend uses string. 
                // JS handles bigints sometimes weirdly if not careful, but usually toString() works.
                // Let's cast or map standardly.
                const mapped: Comment[] = data.map((item: any) => ({
                    ...item,
                    id: item.id.toString(), // Ensure ID is string
                    // Ensure replies defaults to [] if null
                    replies: item.replies || []
                }));
                setComments(mapped);
            }
        } catch (e) {
            console.error('Failed to load comments', e);
        } finally {
            setLoading(false);
        }
    };

    const saveComments = async (newComments: Comment[]) => {
        // We don't save the whole list anymore. We insert specific items.
        // But the previous architecture passed the WHOLE list to this function.
        // We need to change the logic of handlePost/Reply/Like to call specfic Supabase actions.
        // HOWEVER, to be minimally invasive:
        // 'newComments' contains the latest state. 
        // 1. handlePost adds a new item at top. We should just insert that ONE item.
        // 2. handleLike/Reply updates an existing item. We should update that ONE item.

        // Refactoring handlePost/Like/Reply to call separate functions is better.
        // But to keep signature, we might need to inspect what changed? No that's hard.
        // Let's deprecate saveComments and make specific functions.
    };

    // New helper to add comment
    const addComment = async (comment: Comment) => {
        const { error } = await supabase.from('pixkee_comments').insert({
            content: comment.content,
            image: comment.image,
            timestamp: comment.timestamp,
            likes: 0,
            replies: []
        });
        if (!error) loadComments(); // Reload to get ID and correct state
    };

    // New helper to update comment (for likes/replies)
    const updateComment = async (comment: Comment) => {
        const { error } = await supabase
            .from('pixkee_comments')
            .update({
                likes: comment.likes,
                replies: comment.replies
            })
            .eq('id', comment.id); // Note: comment.id is string, DB is bigint. Postgres handles '123' -> 123 fine.

        if (error) console.error('Update failed', error);
        // We might not need to reload for likes if local state is optimistic, 
        // but for consistency let's relying on loadComments or just keep local state.
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
            id: 'validating...', // Temp ID
            content,
            image: imageBase64,
            timestamp: Date.now(),
            likes: 0,
            replies: []
        };

        // Optimistic UI update (optional, but good)
        // setComments([newComment, ...comments]); 

        await addComment(newComment);
    };

    const handleLike = async (commentId: string) => {
        // Find and update local state first (Optimistic)
        const comment = comments.find(c => c.id === commentId);
        // Deep search needed? The previous logic used recursion.

        // Let's look at the previous logic for recursion.
        const updateRecursive = (list: Comment[]): { updatedList: Comment[], target?: Comment } => {
            let target: Comment | undefined;
            const updatedList = list.map(c => {
                if (c.id === commentId) {
                    const updated = { ...c, likes: c.likes + 1, isLiked: true };
                    target = updated;
                    return updated;
                }
                if (c.replies) {
                    const res = updateRecursive(c.replies);
                    if (res.target) target = res.target;
                    return { ...c, replies: res.updatedList };
                }
                return c;
            });
            return { updatedList, target };
        };

        const { updatedList, target } = updateRecursive(comments);
        setComments(updatedList);

        if (target) {
            // We need to update the top-level comment (because our DB structure might store replies nested in JSONB)
            // Wait, if it's a reply nested deep, do we update the ROOT comment's JSON or the reply itself?
            // Our DB schema `pixkee_comments` is flat for top-level. 
            // If replies are just JSONB in the parent, we must update the PARENT.
            // This is tricky if we don't know the parent ID of a nested reply easily.

            // SIMPLIFICATION FOR MVP: 
            // If we are liking a Top-Level comment -> Update Row directly.
            // If we are liking a Reply -> We must update the Parent Row's `replies` JSON.

            // To properly handle this without complex parent-tracking, 
            // maybe we should just reload validation?
            // Or let's just attempt to update the root comment if found.

            // Actually, finding the 'root' of the modified comment is safer.
            const findRoot = (list: Comment[]): Comment | undefined => {
                for (const c of list) {
                    if (c.id === commentId) return c; // It is root
                    // Check children
                    if (JSON.stringify(c).includes(commentId)) return c; // Dirty check but works for "is this inside"
                }
            };

            // Correct approach: updating the root comment that contains the change
            // Since `updatedList` already has the modified structure, 
            // we find which root element changed and push that whole root element params.

            const root = updatedList.find(c =>
                c.id === commentId || JSON.stringify(c.replies).includes(commentId)
            );

            if (root) {
                await updateComment(root);
            }
        }
    };

    const handleReply = async (commentId: string, content: string, image: File | null) => {
        let imageBase64: string | undefined;
        if (image) {
            imageBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(image);
            });
        }

        const reply: Comment = {
            id: Date.now().toString(),
            content,
            image: imageBase64,
            timestamp: Date.now(),
            likes: 0,
            replies: []
        };

        const updateRecursive = (list: Comment[]): Comment[] => {
            return list.map(c => {
                if (c.id === commentId) {
                    return { ...c, replies: [...(c.replies || []), reply] };
                }
                if (c.replies) {
                    return { ...c, replies: updateRecursive(c.replies) };
                }
                return c;
            });
        };

        const updated = updateRecursive(comments);
        setComments(updated); // Optimistic

        // Determine root parent to update DB
        const root = updated.find(c =>
            c.id === commentId || JSON.stringify(c.replies).includes(commentId)
        );
        if (root) {
            await updateComment(root);
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
