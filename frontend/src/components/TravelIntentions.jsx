import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { endpoints, errorMessage } from '../api.js';
import AccordionGallery from './AccordionGallery.jsx';
import FadeContent from './FadeContent.jsx';

const PAGE_SIZE = 5;

export default function TravelIntentions({ getId, getImage, getTitle, getPlace, getPrice, formatMoney }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pages: 0, total: 0 });
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    endpoints.packages({ page, limit: PAGE_SIZE }).then(({ data }) => {
      if (!current) return;
      setResult({ items: data.items, pages: data.pages, total: data.total });
      setActive(0);
    }).catch((failure) => {
      if (current) setError(errorMessage(failure, 'Journeys could not be loaded.'));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, retry]);

  const items = useMemo(() => result.items.map((trip) => ({
    id: getId(trip),
    image: getImage(trip),
    title: getTitle(trip),
    destination: getPlace(trip),
    duration: trip.durationDays,
    price: formatMoney(getPrice(trip), trip.currency || 'USD'),
  })), [result.items, getId, getImage, getTitle, getPlace, getPrice, formatMoney]);
  const selected = items[active];

  return <section className="intentions" aria-labelledby="intentions-heading">
    <div className="content-shell intentions-gallery-layout">
      <FadeContent className="intentions-gallery-heading" effect="focus" duration={0.8}>
        <div className="intentions-copy"><div className="eyebrow">TRAVEL, WITH INTENTION</div><h2 id="intentions-heading">Less itinerary.<br/><em>More in the moment.</em></h2><p>Find a journey with just enough plan and plenty of possibility. Explore the places calling your name.</p></div>
        <Link to="/explore" className="text-link">Explore all journeys <ArrowRight size={16}/></Link>
      </FadeContent>
      <FadeContent effect="focus" duration={0.9}>
        {loading ? <div className="gallery-state" role="status">Finding your next journey...</div>
          : error ? <div className="gallery-state" role="alert">{error} <button type="button" className="text-link" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
            : !items.length ? <div className="gallery-state">No journeys on this page. {page > 1 ? <button className="text-link" type="button" onClick={() => setPage((value) => value - 1)}>Previous journeys</button> : <Link className="text-link" to="/explore">Explore trips <ArrowRight size={14}/></Link>}</div>
              : <>
                <AccordionGallery items={items} active={active} onSelect={setActive} reducedMotion={reducedMotion}/>
                <div className="gallery-bottom">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={selected.id} className="gallery-details" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
                      <span><MapPin size={14}/>{selected.destination}</span><span><Clock3 size={14}/>{selected.duration ? `${selected.duration} days` : 'Flexible duration'}</span><strong>From {selected.price}</strong>
                      <Link className="button button-dark" to={`/trips/${selected.id}`}>Discover journey <ArrowRight size={15}/></Link>
                    </motion.div>
                  </AnimatePresence>
                  <div className="gallery-pagination" aria-label="Journey gallery pages">
                    <span>{Math.min((page - 1) * PAGE_SIZE + 1, result.total)}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total} journeys</span>
                    <button type="button" disabled={page <= 1} aria-label="Previous journeys" onClick={() => setPage((value) => value - 1)}><ArrowLeft size={17}/></button>
                    <button type="button" disabled={page >= result.pages} aria-label="Next journeys" onClick={() => setPage((value) => value + 1)}><ArrowRight size={17}/></button>
                  </div>
                </div>
                <p className="gallery-hint">Hover, tap or use the arrow keys to explore.</p>
              </>}
      </FadeContent>
    </div>
  </section>;
}
