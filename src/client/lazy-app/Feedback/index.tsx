import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../../supabase';

import CommentList, { Comment } from './CommentList';
import CommentForm from './CommentForm';
import * as style from './styles.css';
import 'add-css:./styles.css';

interface FeedbackProps {
    onBack?: () => void;
}

const STORAGE_KEY = 'squoosh-comments';

export default function Feedback({ onBack }: FeedbackProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

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
                        <h1 class={style.title}>Feedback</h1>
                        <p class={style.subtitle}>Leave your feedback, suggestions, or just say hello!</p>
                    </div>
                </header>

                <CommentForm onSubmit={handlePost} placeholder="Type your comment..." />

                <div class={style.commentsSection}>
                    <h2 class={style.sectionTitle}>
                        Latest Comments ({comments.length})
                    </h2>

                    {loading ? (
                        <div class={style.loading}>Loading...</div>
                    ) : (
                        <CommentList
                            comments={comments}
                            onLike={handleLike}
                            onReply={handleReply}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
