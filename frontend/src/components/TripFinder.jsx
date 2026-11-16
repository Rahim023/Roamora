import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Wallet } from 'lucide-react';
import AnimatedSelect from './AnimatedSelect.jsx';

export default function TripFinder() {
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const navigate = useNavigate();

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set('destination', destination.trim());
    if (budget !== '') { params.set('maxPrice', budget); params.set('currency', 'CAD'); }
    if (duration) params.set('maxDays', duration);
    navigate(`/explore${params.size ? `?${params}` : ''}`);
  }

  return <section id="trip-search" className="finder content-shell" aria-label="Find a trip">
    <div className="finder-heading"><span className="finder-compass"><MapPin size={20}/></span><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Where to next?</h2></div></div>
    <form className="finder-form" onSubmit={submit}>
      <label className="finder-field"><span><MapPin size={15}/> Destination</span><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Anywhere in the world"/></label>
      <label className="finder-field"><span><Wallet size={15}/> Max budget per person (CAD)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. CAD 2,000"/></label>
      <label className="finder-field"><span><CalendarDays size={15}/> Duration</span><AnimatedSelect value={duration} onChange={(event) => setDuration(event.target.value)}><option value="">Any length</option><option value="4">Up to 4 days</option><option value="7">Up to 7 days</option><option value="14">Up to 14 days</option><option value="30">Up to 30 days</option></AnimatedSelect></label>
      <button className="button button-dark finder-button">Find my trip <ArrowRight size={17}/></button>
    </form>
    <p className="finder-note">Budget searches show CAD-priced trips only; prices are not converted.</p>
  </section>;
}
