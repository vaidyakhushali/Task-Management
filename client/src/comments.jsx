import { useEffect, useState } from 'react';
import { addTaskComment, getTaskComments } from './api';

function Comments({ taskId }) {
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

    let isActive = true;
    setIsLoading(true);
    setError('');

    getTaskComments(taskId)
      .then((response) => {
        if (!isActive) return;
        setComments(response.data || []);
      })
      .catch((loadError) => {
        if (!isActive) return;
        setError(loadError.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [taskId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = commentInput.trim();
    if (!trimmed || !taskId) return;

    try {
      const response = await addTaskComment(taskId, trimmed);
      setComments((current) => [...current, response.data]);
      setCommentInput('');
      setError('');
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <div className="task-comments">
      <h3>Comments</h3>
      <div className="task-chat-messages">
        {isLoading && <p className="task-empty">Loading comments...</p>}
        {!isLoading && comments.length === 0 && !error && <p className="task-empty">No comments yet.</p>}
        {comments.map((comment) => (
          <p className="task-chat-message" key={comment._id || `${comment.user?.fullname}-${comment.message}`}>
            <strong>{comment.user?.fullname || 'User'}</strong>
            <span>{comment.message}</span>
          </p>
        ))}
      </div>
      {error && <p className="task-error" role="alert">{error}</p>}
      <form className="task-chat-form" onSubmit={handleSubmit}>
        <input
          value={commentInput}
          onChange={(event) => setCommentInput(event.target.value)}
          placeholder="Write a comment..."
          aria-label="Write a comment"
          maxLength="1000"
        />
        <button type="submit">Add comment</button>
      </form>
    </div>
  );
}

export default Comments;
