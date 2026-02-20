import { supabase } from "@/lib/supabase";
import useUserStore from "@/zustand/userStore";
import CommentListItem from "./CommentListItem";
import CommentNew from "./CommentNew";

interface CommunityComment {
  id: number;
  author_id: string;
  author_nickname: string;
  author_username: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

interface Props {
  postId: number;
  comments: CommunityComment[];
  onRefresh: () => void;
}

export default function CommentList({ postId, comments, onRefresh }: Props) {
  const { user } = useUserStore();
  const isAdmin = user?.role === "admin";

  const handleSubmit = async (content: string) => {
    if (!user) return;
    await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      author_nickname: user.nickname,
      author_username: user.username,
      content,
    });
    onRefresh();
  };

  const handleUpdate = async (id: number, content: string) => {
    await supabase
      .from("community_comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (isAdmin) {
      await supabase.rpc("admin_delete_community_comment", { p_comment_id: id });
    } else {
      await supabase.from("community_comments").delete().eq("id", id);
    }
    onRefresh();
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section__title">
        댓글 <span className="comment-section__count">{comments.length}</span>
      </h3>

      {comments.length > 0 ? (
        <ul className="comment-section__list">
          {comments.map((comment) => (
            <CommentListItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      ) : (
        <p className="comment-section__empty">첫 댓글을 남겨보세요.</p>
      )}

      <CommentNew isLoggedIn={!!user} onSubmit={handleSubmit} />
    </div>
  );
}
