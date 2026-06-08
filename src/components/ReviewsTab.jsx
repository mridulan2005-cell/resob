import { useEffect, useState, useCallback } from 'react';
import { Star, Trash2, Edit2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { timeAgo } from '../utils/helpers';

export default function ReviewsTab({ courseId }) {
  const { user } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/courses/${courseId}/reviews`);
      setReviews(res.data.reviews || []);
      setStats(res.data.stats || null);
      setUserReview(res.data.userReview || null);
      if (res.data.userReview) {
        setRating(res.data.userReview.rating);
        setComment(res.data.userReview.comment || '');
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetch(); }, [fetch]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { toast('Pick a rating', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post(`/courses/${courseId}/reviews`, { rating, comment });
      toast(userReview ? 'Review updated' : 'Review posted', 'success');
      setEditing(false);
      fetch();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!userReview || !confirm('Delete your review?')) return;
    try {
      await api.delete(`/courses/${courseId}/reviews/${userReview.id}`);
      setRating(0); setComment(''); setUserReview(null);
      fetch();
    } catch {}
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />;
  }

  const avg = stats?.average ? Number(stats.average).toFixed(1) : null;
  const count = stats?.count || 0;
  const distribution = [5, 4, 3, 2, 1].map(n => ({
    rating: n,
    count: stats?.[`r${n}`] || 0,
    pct: count > 0 ? ((stats?.[`r${n}`] || 0) / count) * 100 : 0,
  }));

  return (
    <div className="reviews-tab">
      {/* Aggregate */}
      {count > 0 && (
        <div className="reviews-aggregate glass-card">
          <div className="reviews-avg">
            <div className="reviews-avg-num">{avg}</div>
            <Stars rating={Math.round(stats.average)} size={16} />
            <div className="reviews-avg-count">{count} {count === 1 ? 'review' : 'reviews'}</div>
          </div>
          <div className="reviews-dist">
            {distribution.map(({ rating: n, count: c, pct }) => (
              <div key={n} className="reviews-dist-row">
                <span className="reviews-dist-label">{n}★</span>
                <span className="reviews-dist-bar">
                  <span className="reviews-dist-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="reviews-dist-count">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit / edit form */}
      {user ? (
        <div className="reviews-form glass-card">
          <h4>{userReview && !editing ? 'Your review' : userReview ? 'Edit your review' : 'Leave a review'}</h4>
          {userReview && !editing ? (
            <div className="reviews-your-row">
              <Stars rating={userReview.rating} size={18} />
              {userReview.comment && <p className="reviews-your-text">{userReview.comment}</p>}
              <div className="reviews-your-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
                  <Edit2 size={14} /> Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={remove}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div
                className="rating-input"
                onMouseLeave={() => setHoverRating(0)}
                role="radiogroup"
                aria-label="Rating"
              >
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`rating-star ${(hoverRating || rating) >= n ? 'on' : ''}`}
                    onMouseEnter={() => setHoverRating(n)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-checked={rating === n}
                    role="radio"
                  >
                    <Star size={22} fill={(hoverRating || rating) >= n ? 'currentColor' : 'none'} />
                  </button>
                ))}
                <span className="rating-input-hint">
                  {(hoverRating || rating)
                    ? ['', 'Poor','Fair','Good','Great','Excellent'][hoverRating || rating]
                    : 'Click a star to rate'}
                </span>
              </div>
              <textarea
                className="form-input no-icon"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your honest take — workload, pace, what stood out…"
                maxLength={1000}
                rows={3}
              />
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting || !rating}>
                  {submitting ? 'Saving…' : userReview ? 'Update review' : 'Post review'}
                </button>
                {editing && (
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setEditing(false);
                    setRating(userReview.rating);
                    setComment(userReview.comment || '');
                  }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="reviews-form glass-card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Sign in to leave a review.
          </p>
        </div>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
          <Star size={40} />
          <p>No reviews yet. Be the first to share your experience.</p>
        </div>
      ) : (
        <ul className="reviews-list">
          {reviews
            .filter(r => !userReview || r.id !== userReview.id) // form already shows your review
            .map(r => (
              <li key={r.id} className="reviews-item glass-card">
                <div className="reviews-item-head">
                  <div className="reviews-item-author">{r.user_name}</div>
                  <Stars rating={r.rating} size={14} />
                  <div className="reviews-item-time">{timeAgo(r.created_at)}</div>
                </div>
                {r.comment && <p className="reviews-item-text">{r.comment}</p>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function Stars({ rating, size = 16 }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? 'currentColor' : 'none'}
          strokeWidth={1.6}
          aria-hidden
        />
      ))}
    </span>
  );
}
