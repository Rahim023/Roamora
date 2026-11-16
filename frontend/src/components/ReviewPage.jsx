import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MapPin, Sparkles } from 'lucide-react';
import { endpoints, errorMessage } from '../api.js';
import { packageImage } from '../destinationImages.js';
import PeekRating from './PeekRating.jsx';
import './ReviewExperience.css';

const labels = ['Poor', 'Fair', 'Good', 'Great', 'Exceptional'];
const idOf = (value) => String(value?._id || value?.id || value || '');

export default function ReviewPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSaved(false);
    setRating(0);
    setComment('');
    Promise.all([endpoints.order(id), endpoints.pendingReviews()]).then(([bookingResponse, pendingResponse]) => {
      if (!active) return;
      const booking = bookingResponse.data.order;
      const pending = pendingResponse.data.items;
      setOrder(booking);
      setEligible(booking.status === 'completed' && pending.some((item) => idOf(item.package) === idOf(booking.package)));
    }).catch((failure) => {
      if (active) setError(errorMessage(failure, 'We could not load this journey.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!rating) { setError('Choose a rating before sharing your review.'); return; }
    if (comment.trim().length < 5) { setError('Please write at least 5 characters about your journey.'); return; }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await endpoints.createReview({ packageId: idOf(order.package), bookingId: idOf(order), rating, comment: comment.trim() });
      setSaved(true);
    } catch (failure) {
      setError(errorMessage(failure, 'Your review could not be saved.'));
    } finally { submitting.current = false; setSaving(false); }
  };

  return <main className="review-page content-shell page-content">
    <Link to="/dashboard" className="back-link"><ArrowLeft size={15}/> Back to my trips</Link>
    {loading ? <p role="status">Loading your journey…</p> : error && !order ? <div className="review-page-message" role="alert">{error}</div> : order && <div className="review-page-grid">
      <aside className="review-journey-card"><img src={packageImage(order.packageSnapshot || {})} alt=""/><div><span><Sparkles size={14}/> A STORY WORTH SHARING</span><h1>{order.packageSnapshot?.title || 'Your journey'}</h1><p><MapPin size={14}/>{order.packageSnapshot?.destination}</p><small>{order.bookingReference}</small></div></aside>
      <section className="review-composer" aria-labelledby="review-page-title">
        <div className="review-kicker">YOUR JOURNEY · YOUR VOICE</div>
        {saved ? <div className="review-success" role="status"><span><Check size={23}/></span><h2 id="review-page-title">Thank you for sharing.</h2><p>Your review has been saved. Your perspective helps other travellers find their way.</p><Link className="button button-dark" to="/dashboard">Back to my trips <ArrowRight size={15}/></Link></div> : !eligible ? <><h2 id="review-page-title">Nothing to review here.</h2><p>This booking is not completed, or you have already reviewed this journey.</p><Link className="button button-dark" to="/dashboard">Back to my trips <ArrowRight size={15}/></Link></> : <>
          <h2 id="review-page-title">How was your journey?</h2><p>The little details make a big difference. Tell us what it was really like.</p>
          <form onSubmit={submit} className="review-composer-form">
            <div className="review-rating-label">YOUR RATING <span>{rating ? `${rating} / 5 · ${labels[rating - 1]}` : 'Choose a star'}</span></div>
            <PeekRating value={rating} onChange={setRating} labels={labels} ariaLabel="Your journey rating" activeColor="#b47e45" idleColor="#bacac0" tipColor="#294d40" size={34} allowClear={false} disabled={saving}/>
            <label htmlFor="review-story">YOUR EXPERIENCE</label>
            <textarea id="review-story" rows="6" minLength={5} maxLength={4000} required disabled={saving} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What made this journey memorable?"/>
            <small>At least 5 characters. Your review may be shown to other travellers.</small>
            {error && <div className="review-page-error" role="alert">{error}</div>}
            <button type="submit" className="button button-dark" disabled={saving}>{saving ? 'Sharing…' : <>Share your review <ArrowRight size={15}/></>}</button>
          </form>
        </>}
      </section>
    </div>}
  </main>;
}
