import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, ArrowUpDown, CalendarDays, Check, ChevronDown, Compass,
  Heart, MapPin, Menu, Minus, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles, LogIn,
  Star, X, Users, Plane, Clock3, LogOut, LayoutDashboard, CircleUserRound, LoaderCircle,
  Trash2, GripVertical, ListChecks, ChartNoAxesCombined, Package, Ticket, MessageSquareText, House, Map, ArrowLeftRight, BriefcaseBusiness,
  Mail, LockKeyhole, UserRound, Eye, EyeOff, Sun, Moon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { z } from 'zod';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gsap } from 'gsap';
import { GoogleLogin } from '@react-oauth/google';
import { api, endpoints, errorMessage } from './api.js';
import { useAuth } from './auth.jsx';
import AdventureHero from './components/AdventureHero.jsx';
import TripMap from './components/TripMap.jsx';
import TripFinder from './components/TripFinder.jsx';
import TripShowcase from './components/TripShowcase.jsx';
import TravelIntentions from './components/TravelIntentions.jsx';
import FadeContent from './components/FadeContent.jsx';
import SpecularControls from './components/SpecularControls.jsx';
import AnimatedSelect from './components/AnimatedSelect.jsx';
import { packageImage } from './destinationImages.js';
import { adminBookingReference, adminPersonName } from './adminDisplay.js';
import roamoraLogo from './components/roamora-logo.png';
import ExploreGlobe from './components/ExploreGlobe.jsx';
import Travo from './components/Travo.jsx';
import TravoBubble from './components/TravoBubble.jsx';
import './components/TravoBubble.css';
import ClickSpark from './components/ClickSpark.jsx';
import CircularCarousel from './components/CircularCarousel.jsx';
import DestinationGuides from './components/DestinationGuides.jsx';
import CometDial from './components/CometDial.jsx';
import { CompareLayout } from './components/CompareStyles.js';
import PasswordResetModal from './components/PasswordResetModal.jsx';
import { passwordSchema } from './authValidation.js';
import JourneyAtmosphere from './components/JourneyAtmosphere.jsx';
import CancelBookingModal from './components/CancelBookingModal.jsx';
import HoldButton from './components/HoldButton.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import PeekRating from './components/PeekRating.jsx';
import ReviewPage from './components/ReviewPage.jsx';
import ReviewReminder from './components/ReviewReminder.jsx';
import SwipeToast from './components/SwipeToast.jsx';
import './components/JourneyPages.css';
import './components/AdminPage.css';
import './components/ItineraryStudio.css';

gsap.registerPlugin(ScrollTrigger);

const money = (value, currency = 'USD') => {
  if (value == null || Number.isNaN(Number(value))) return 'Price on request';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(value);
};
const records = (data) => Array.isArray(data) ? data : data?.items || data?.results || data?.data || [];
const itemId = (item) => item?.id ?? item?._id;
const packageTitle = (item) => item?.title || item?.name || 'A little further';
const tripPlace = (item) => item?.destination || item?.location || item?.country || 'Somewhere wonderful';
const tripPrice = (item) => item?.pricePerPersonMinor != null
  ? item.pricePerPersonMinor / 100
  : item?.price ?? item?.priceFrom ?? item?.startingPrice;
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const journeyDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'To be confirmed';

function JourneyBanner({ eyebrow, title, copy, children }) {
  const reduceMotion = useReducedMotion();
  return <div className="journey-banner">
    <JourneyAtmosphere/>
    <motion.div className="journey-banner-content" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <div className="journey-banner-eyebrow"><Compass size={15} aria-hidden="true"/>{eyebrow}</div>
      <h1>{title}</h1><p>{copy}</p>{children}
    </motion.div>
    <div className="journey-banner-orbit" aria-hidden="true"><Plane size={24}/></div>
  </div>;
}

function PageIntro({ eyebrow, title, copy, children }) {
  return <FadeContent className="page-intro" effect="focus" duration={0.8}><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{copy && <p>{copy}</p>}{children}</FadeContent>;
}

function ThemeSwitch({ night, onToggle }) {
  return <button type="button" className="theme-switch" role="switch" aria-label="Night theme" aria-checked={night} onClick={onToggle}>
    <span className="theme-switch-track" aria-hidden="true"><Sun size={14}/><Moon size={14}/><span className="theme-switch-thumb"/></span>
    <span className="theme-switch-label" aria-hidden="true">{night ? 'Night' : 'Day'}</span>
  </button>;
}

function Header({ night, onToggleTheme }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const header = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isPlanner = location.pathname === '/dashboard' && new URLSearchParams(location.search).get('tab') === 'itinerary';
  const isTravo = location.pathname === '/travo';
  const close = () => setOpen(false);
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    const handlePointerDown = (event) => {
      if (!header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('pointerdown', handlePointerDown); };
  }, [open]);
  return <header ref={header} className={`site-header${isHome ? ' site-header-home' : ''}`}>
    <Link to="/" className="brand header-brand" aria-label="Roamora home" onClick={close}>
      <span className="header-logo" aria-hidden="true">
        <img src={roamoraLogo} alt=""/>
      </span>
    </Link>
    <button ref={menuButton} type="button" className="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen((value) => !value)}>{open ? <X size={21}/> : <Menu size={21}/>}</button>
    <nav id="primary-navigation" aria-label="Main navigation" className={`main-nav ${open ? 'is-open' : ''}`}>
      <div className="nav-mobile-heading"><span>YOUR NEXT CHAPTER</span><strong>Where to?</strong></div>
      <NavLink to="/" end onClick={close}><House size={16} aria-hidden="true"/> Home</NavLink>
      <NavLink to="/explore" onClick={close}><Map size={16} aria-hidden="true"/> Explore</NavLink>
      <NavLink to="/compare" onClick={close}><ArrowLeftRight size={16} aria-hidden="true"/> Compare</NavLink>
      <Link to="/travo" className={`nav-planner${isTravo ? ' active' : ''}`} aria-current={isTravo ? 'page' : undefined} onClick={close}><Sparkles size={16} aria-hidden="true"/> Travo</Link>
      {user && <Link to="/dashboard" className={location.pathname === '/dashboard' && !isPlanner ? 'active' : undefined} aria-current={location.pathname === '/dashboard' && !isPlanner ? 'page' : undefined} onClick={close}><BriefcaseBusiness size={16} aria-hidden="true"/> My trips</Link>}
      {user?.role === 'admin' && <NavLink to="/admin" onClick={close}><ShieldCheck size={16} aria-hidden="true"/> Admin</NavLink>}
      <div className="mobile-theme-control"><ThemeSwitch night={night} onToggle={onToggleTheme}/></div>
      <div className="mobile-nav-auth">{user ? <button onClick={() => { close(); signOut(); navigate('/'); }}><LogOut size={16}/> Sign out</button> : <Link to="/login" onClick={close}><LogIn size={16}/> Log in</Link>}</div>
    </nav>
    <div className="header-actions">
      <div className="desktop-theme-control"><ThemeSwitch night={night} onToggle={onToggleTheme}/></div>
      {user ? <><Link to="/dashboard" className="avatar-link" aria-label="Your account" title="Your account"><span className="avatar">{(user.name || user.email || 'R').charAt(0).toUpperCase()}</span></Link>
        <button className="button button-quiet header-signout" onClick={() => { signOut(); navigate('/'); }}><LogOut size={16}/> Sign out</button></>
        : <><Link to="/login" className="button button-quiet header-login"><LogIn size={16}/> Log in</Link><Link to="/register" className="button button-dark header-join">Join Roamora <ArrowRight size={15}/></Link></>}
    </div>
  </header>;
}

function Footer() {
  return <footer className="site-footer"><Link to="/" className="brand footer-logo" aria-label="Roamora home"><img src={roamoraLogo} alt="Roamora"/></Link>
    <span>Go thoughtfully. Come back changed.</span><span>© {new Date().getFullYear()} Roamora</span></footer>;
}

function Protected({ admin = false, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="center-state"><LoaderCircle className="spin"/> Getting things ready…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function Alert({ children, type = 'error', onClose }) {
  if (!children) return null;
  return <div className={`alert-box alert-${type}`} role="status">{children}{onClose && <button aria-label="Dismiss" onClick={onClose}><X size={15}/></button>}</div>;
}

function Loading({ label = 'Finding the good stuff…' }) {
  return <div className="center-state"><LoaderCircle className="spin"/> {label}</div>;
}

function EmptyState({ icon: Icon = Compass, title, copy, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24}/></span><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

function TripCard({ trip, saved = false, onWishlist, compare = false, onCompare }) {
  const id = itemId(trip);
  return <FadeContent className="trip-card-reveal" effect="focus" duration={0.7}><motion.article className="trip-card" whileHover={{ y: -4 }} transition={{ duration: .18 }}>
    <div className="trip-image-wrap"><Link to={`/trips/${id}`} aria-label={`View ${packageTitle(trip)}`} className="trip-image-link">
      <img src={packageImage(trip)} alt={packageTitle(trip)} className="trip-image"/>
      {trip?.badge && <span className="trip-badge">{trip.badge}</span>}
      </Link>
      {onWishlist && <button data-click-spark className={`icon-button save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove from wishlist' : 'Save trip'} onClick={() => onWishlist(trip)}>
        <Heart size={18} fill={saved ? 'currentColor' : 'none'}/></button>}
    </div>
    <div className="trip-card-body">
      <div className="trip-card-kicker"><span><MapPin size={13}/>{tripPlace(trip)}</span>{trip?.rating && <span className="rating"><Star size={13} fill="currentColor"/>{trip.rating}</span>}</div>
      <Link to={`/trips/${id}`} className="trip-title">{packageTitle(trip)}</Link>
      <div className="trip-card-bottom"><span className="trip-duration"><Clock3 size={14}/>{trip?.durationDays || trip?.days || 'Flexible'} days</span>
        <span className="trip-price"><small>from</small> {money(tripPrice(trip), trip?.currency || 'USD')}</span></div>
      {onCompare && <button data-click-spark className={`compare-toggle ${compare ? 'selected' : ''}`} onClick={() => onCompare(trip)}>{compare ? <><Check size={14}/> Added to compare</> : <><Plus size={14}/> Compare trip</>}</button>}
    </div>
  </motion.article></FadeContent>;
}

function useWishlist() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const { data } = await endpoints.wishlist(); setItems(records(data).map((x) => x.package || x)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, []);
  const toggle = useCallback(async (trip) => {
    const id = itemId(trip);
    const exists = items.some((x) => String(itemId(x)) === String(id));
    try {
      if (exists) { await endpoints.removeWishlist(id); setItems((old) => old.filter((x) => String(itemId(x)) !== String(id))); }
      else { await endpoints.addWishlist(id); setItems((old) => [...old, trip]); }
      setError('');
    } catch (e) { setError(errorMessage(e, 'Please sign in to save trips.')); }
  }, [items]);
  return { items, setItems, error, refresh, toggle };
}

function Landing() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    endpoints.packages({ sort: 'popular', page: 1, limit: 3 }).then(({ data }) => setTrips(records(data).slice(0, 3)))
      .catch((e) => setError(errorMessage(e, 'Trips are taking a moment to load.')))
      .finally(() => setLoading(false));
  }, []);
  return <>
    <AdventureHero/>
    <TripFinder/>
    <TripShowcase trips={trips} getId={itemId} getImage={packageImage} getTitle={packageTitle} getPlace={tripPlace}>{loading ? <Loading/> : error ? <Alert>{error}</Alert> : <EmptyState title="Your next story starts here" copy="We're getting new journeys ready. Check back soon." action={<Link className="button button-light" to="/explore">Explore trips</Link>}/>}</TripShowcase>
    <TravelIntentions getId={itemId} getImage={packageImage} getTitle={packageTitle} getPlace={tripPlace} getPrice={tripPrice} formatMoney={money}/>
    <FadeContent className="closing-cta content-shell" effect="focus" duration={0.8}><div className="closing-icon"><Compass/></div><div><div className="eyebrow">YOUR NEXT CHAPTER</div><h2>Ready to get lost<br/>in the right direction?</h2></div><Link to="/explore" className="button button-dark button-large">Let’s wander <ArrowRight size={17}/></Link></FadeContent>
  </>;
}

function ExploreJourneys({ trips, user, wishlist, compareIds, onCompare }) {
  const carousel = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const trip = trips[selectedIndex] || trips[0];
  const id = itemId(trip);
  const saved = wishlist.items.some((item) => String(itemId(item)) === String(id));
  const compared = compareIds.includes(id);
  const items = useMemo(() => trips.map((item) => ({
    src: packageImage(item), alt: item.imageAlt || packageTitle(item),
    title: packageTitle(item), subtitle: tripPlace(item),
  })), [trips]);

  return <div className="journey-discovery">
    <div className="journey-carousel-side">
      <div className="journey-carousel-topline"><span>THE ROAMORA COLLECTION</span><span>{String(selectedIndex + 1).padStart(2, '0')} / {String(trips.length).padStart(2, '0')}</span></div>
      <div className="journey-carousel-stage">
        <div className="journey-carousel-halo" aria-hidden="true"/>
        <CircularCarousel ref={carousel} items={items} preset="cylinder" intro="rise" autoplay="off" cardWidth={230} aspectRatio={1.2} gap={24} fitImages itemLabels fadeColor="#e9f1e8" depthFade={0.38} innerShade={0.3} cornerRadius={16} parallax={0.12} onChange={setSelectedIndex}/>
      </div>
      <div className="journey-carousel-footer">
        <p>Drag to discover <span aria-hidden="true">·</span> Select a journey to bring it closer</p>
        <div className="journey-carousel-controls">
          <button type="button" aria-label="Previous journey" disabled={trips.length < 2} onClick={() => carousel.current?.previous()}><ArrowLeft size={17}/></button>
          <button type="button" aria-label="Next journey" disabled={trips.length < 2} onClick={() => carousel.current?.next()}><ArrowRight size={17}/></button>
        </div>
      </div>
      <p className="journey-carousel-keyboard">Use the left and right arrow keys on the carousel to explore.</p>
    </div>
    <article className="journey-spotlight" aria-label={`Details for ${packageTitle(trip)}`}>
      <div className="journey-spotlight-top"><span><MapPin size={14}/> {tripPlace(trip)}{trip.country && trip.country !== tripPlace(trip) ? `, ${trip.country}` : ''}</span><span>{trip.travelType || trip.category || 'CURATED JOURNEY'}</span></div>
      <div className="journey-spotlight-body">
        <span className="journey-spotlight-label">A JOURNEY WORTH TAKING</span>
        <h3>{packageTitle(trip)}</h3>
        {trip.summary && <p className="journey-summary">{trip.summary}</p>}
        {trip.description && trip.description !== trip.summary && <p className="journey-description">{trip.description}</p>}
        <div className="journey-facts">
          <div><Clock3 size={17}/><span><small>DURATION</small><strong>{trip.durationDays ? `${trip.durationDays} days${trip.nights != null ? ` / ${trip.nights} nights` : ''}` : 'Flexible'}</strong></span></div>
          {trip.accommodation && <div><BriefcaseBusiness size={17}/><span><small>STAY</small><strong>{trip.accommodation}</strong></span></div>}
          {trip.averageRating > 0 && <div><Star size={17}/><span><small>RATING</small><strong>{Number(trip.averageRating).toFixed(1)}{trip.reviewCount ? ` (${trip.reviewCount})` : ''}</strong></span></div>}
        </div>
        {trip.included?.length > 0 && <div className="journey-included"><span>INCLUDED IN YOUR JOURNEY</span><ul>{trip.included.map((entry, index) => <li key={`${entry}-${index}`}><Check size={14}/>{entry}</li>)}</ul></div>}
        {(trip.itinerary?.length > 0 || trip.stops?.length > 0 || trip.excluded?.length > 0 || trip.cancellationPolicy) && <details className="journey-more">
          <summary>More journey details <ChevronDown size={16}/></summary>
          {trip.itinerary?.length > 0 && <div><strong>Itinerary</strong>{trip.itinerary.map((day, index) => <p key={day.day || index}><b>Day {day.day || index + 1}{day.title ? ` · ${day.title}` : ''}</b>{day.description && <> — {day.description}</>}</p>)}</div>}
          {trip.stops?.length > 0 && <div><strong>Stops</strong>{trip.stops.map((stop, index) => <p key={`${stop.name}-${index}`}><b>{stop.name}{stop.day ? ` · Day ${stop.day}` : ''}</b>{stop.description && <> — {stop.description}</>}</p>)}</div>}
          {trip.excluded?.length > 0 && <div><strong>Not included</strong><p>{trip.excluded.join(' · ')}</p></div>}
          {trip.cancellationPolicy && <div><strong>Cancellation</strong><p>{trip.cancellationPolicy.freeCancellationDaysBefore != null ? `Cancellation window: ${trip.cancellationPolicy.freeCancellationDaysBefore} days before departure.` : 'See journey details for the cancellation policy.'}{trip.cancellationPolicy.refundPercent != null ? ` Refund: ${trip.cancellationPolicy.refundPercent}%.` : ''}</p></div>}
        </details>}
      </div>
      <div className="journey-spotlight-bottom">
        <div className="journey-price"><small>FROM / PER PERSON</small><strong>{money(tripPrice(trip), trip.currency || 'USD')}</strong></div>
        <Link data-click-spark className="button button-dark journey-view" to={`/trips/${id}`}>View journey <ArrowRight size={16}/></Link>
      </div>
      <div className="journey-secondary-actions">
        {user ? <button data-click-spark type="button" aria-pressed={saved} onClick={() => wishlist.toggle(trip)}><Heart size={16} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved' : 'Save journey'}</button> : <Link data-click-spark to="/login"><Heart size={16}/> Save journey</Link>}
        <button data-click-spark type="button" aria-pressed={compared} onClick={() => onCompare(trip)}>{compared ? <Check size={16}/> : <Plus size={16}/>} {compared ? 'Added to compare' : 'Compare journey'}</button>
      </div>
    </article>
  </div>;
}

function Explore() {
  const [search, setSearch] = useSearchParams();
  const [query, setQuery] = useState(search.get('q') || '');
  const [form, setForm] = useState(() => ({ destination: search.get('destination') || '', travelType: search.get('travelType') || '', currency: search.get('currency') === 'USD' ? 'USD' : 'CAD', minPrice: search.get('minPrice') || '', maxPrice: search.get('maxPrice') || '', minDays: search.get('minDays') || '', maxDays: search.get('maxDays') || '', sort: search.get('sort') || 'popular' }));
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(() => ['destination', 'travelType', 'minPrice', 'maxPrice', 'minDays', 'maxDays'].some((key) => search.has(key)));
  const { user } = useAuth();
  const wishlist = useWishlist();
  const [compareIds, setCompareIds] = useState(() => JSON.parse(localStorage.getItem('roamora_compare') || '[]'));
  const updateQuery = (key, value) => { setForm((v) => ({ ...v, [key]: value })); setPage(1); };
  const resetFilters = (clearQuery = false) => {
    setForm({ destination: '', travelType: '', currency: 'CAD', minPrice: '', maxPrice: '', minDays: '', maxDays: '', sort: 'popular' });
    if (clearQuery) setQuery('');
    setSearch(!clearQuery && query ? { q: query } : {});
    setPage(1);
  };
  useEffect(() => {
    setQuery(search.get('q') || '');
    const next = { destination: search.get('destination') || '', travelType: search.get('travelType') || '', currency: search.get('currency') === 'USD' ? 'USD' : 'CAD', minPrice: search.get('minPrice') || '', maxPrice: search.get('maxPrice') || '', minDays: search.get('minDays') || '', maxDays: search.get('maxDays') || '', sort: search.get('sort') || 'popular' };
    setForm((current) => Object.keys(next).every((key) => current[key] === next[key]) ? current : next);
    setPage(1);
    if (['destination', 'travelType', 'minPrice', 'maxPrice', 'minDays', 'maxDays'].some((key) => search.has(key))) setShowFilters(true);
  }, [search]);
  const params = useMemo(() => Object.fromEntries(Object.entries({
    q: query, ...form,
    currency: form.minPrice !== '' || form.maxPrice !== '' ? form.currency : '',
    minPrice: form.minPrice === '' ? '' : Math.round(Number(form.minPrice) * 100),
    maxPrice: form.maxPrice === '' ? '' : Math.round(Number(form.maxPrice) * 100),
    page, limit: 9,
  }).filter(([, value]) => value !== '' && value != null)), [query, form, page]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    endpoints.packages(params).then(({ data }) => {
      if (active) { setPayload({ items: records(data), pages: data.pages || 1, total: data.total ?? records(data).length }); setError(''); }
    }).catch((e) => { if (active) setError(errorMessage(e, 'We couldn’t load trips right now.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params]);
  useEffect(() => { if (user) wishlist.refresh(); }, [user]);
  const compare = (trip) => {
    const id = itemId(trip);
    if (!compareIds.includes(id) && compareIds.length >= 3) {
      setError('You can compare up to three trips. Remove one before adding another.');
      return;
    }
    setError('');
    const next = compareIds.includes(id) ? compareIds.filter((x) => x !== id) : compareIds.length < 3 ? [...compareIds, id] : compareIds;
    setCompareIds(next); localStorage.setItem('roamora_compare', JSON.stringify(next));
  };
  return <main className="content-shell page-content explore-page">
    <section className="explore-hero">
      <div className="explore-hero-pattern" aria-hidden="true"/>
      <ExploreGlobe/>
      <FadeContent className="explore-hero-copy" effect="focus" duration={0.8} trigger="mount">
        <div className="explore-hero-eyebrow"><Compass size={15}/> THE WORLD IS WIDE OPEN</div>
        <h1>Find your kind<br/><em>of away.</em></h1>
        <p>From slow mornings to summit days, the right trip is out there.</p>
        <a href="#explore-results" className="explore-hero-link">Find your journey <ArrowRight size={16}/></a>
      </FadeContent>
      <div className="explore-hero-caption" aria-hidden="true"><span>GO A LITTLE FURTHER</span><span>✦</span><span>COME BACK CHANGED</span></div>
    </section>
    <section id="explore-results" aria-label="Explore journeys" className="explore-results">
    <div className="explore-section-heading"><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Explore with <em>Travo</em></h2></div><span className="explore-section-note">AI-powered journey discovery, made for you.</span></div>
    <div className="explore-toolbar">
      <form className="explore-search" onSubmit={(e) => { e.preventDefault(); setSearch(Object.fromEntries(Object.entries({ ...form, q: query }).filter(([, value]) => value !== ''))); setPage(1); }}>
        <Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place, a feeling, a trip…" aria-label="Search trips"/>
        {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => { setQuery(''); setSearch(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))); }}><X size={16}/></button>}
      </form>
      <button className="button button-outline filter-button" aria-expanded={showFilters} aria-controls="explore-filters" onClick={() => setShowFilters((x) => !x)}><SlidersHorizontal size={16}/> Filters {showFilters && <span className="filter-dot"/>}</button>
      <label className="sort-control"><ArrowUpDown size={15}/><AnimatedSelect aria-label="Sort trips" value={form.sort} onChange={(e) => updateQuery('sort', e.target.value)}><option value="popular">Most loved</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="duration_asc">Shortest first</option><option value="rating_desc">Highest rated</option><option value="newest">Newest</option></AnimatedSelect><ChevronDown size={14}/></label>
    </div>
    {showFilters && <motion.div id="explore-filters" className="filter-drawer" initial={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <label>Destination<input placeholder="Anywhere" value={form.destination} onChange={(e) => updateQuery('destination', e.target.value)}/></label>
      <label>Travel style<AnimatedSelect value={form.travelType} onChange={(e) => updateQuery('travelType', e.target.value)}><option value="">All styles</option><option value="Adventure">Adventure</option><option value="Culture">Culture</option><option value="Nature">Nature</option><option value="Beach">Beach</option><option value="City Break">City Break</option></AnimatedSelect></label>
      <label>Budget currency<AnimatedSelect value={form.currency} onChange={(e) => updateQuery('currency', e.target.value)}><option value="CAD">CAD</option><option value="USD">USD</option></AnimatedSelect></label>
      <label>Min price ({form.currency})<input type="number" min="0" step="0.01" placeholder={form.currency} value={form.minPrice} onChange={(e) => updateQuery('minPrice', e.target.value)}/></label>
      <label>Max price ({form.currency})<input type="number" min="0" step="0.01" placeholder={form.currency} value={form.maxPrice} onChange={(e) => updateQuery('maxPrice', e.target.value)}/></label>
      <label>Min days<input type="number" min="1" placeholder="Any" value={form.minDays} onChange={(e) => updateQuery('minDays', e.target.value)}/></label>
      <label>Max days<input type="number" min="1" placeholder="Any" value={form.maxDays} onChange={(e) => updateQuery('maxDays', e.target.value)}/></label>
      <button className="text-link reset-filters" onClick={() => resetFilters()}>Reset filters</button>
      <p className="filter-currency-note">Budget filters only include trips priced in the selected currency. Prices are not converted.</p>
    </motion.div>}
    <div className="results-meta"><span>{payload.total} journeys to wander through</span>{compareIds.length > 0 && <Link to="/compare" className="text-link">Compare {compareIds.length} <ArrowRight size={14}/></Link>}</div>
    {(form.sort === 'price_asc' || form.sort === 'price_desc') && form.minPrice === '' && form.maxPrice === '' && <p className="filter-currency-note">Price sorting compares listed amounts without converting currencies.</p>}
    {wishlist.error && <Alert>{wishlist.error}</Alert>}
    {error && <Alert>{error}</Alert>}
    {loading ? <Loading/> : payload.items.length ? <ExploreJourneys key={payload.items.map((trip) => itemId(trip)).join('|')} trips={payload.items} user={user} wishlist={wishlist} compareIds={compareIds} onCompare={compare}/>
      : <EmptyState icon={Search} title="No trips found, yet." copy={error ? 'Check your connection or try again.' : 'Try widening your filters or searching somewhere new.'} action={<button className="button button-outline" onClick={() => resetFilters(true)}>Clear your search</button>}/>}
    {payload.pages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}><ArrowLeft size={15}/> Previous</button><span>Page {page} of {payload.pages}</span><button disabled={page >= payload.pages} onClick={() => setPage((x) => x + 1)}>Next <ArrowRight size={15}/></button></div>}
    </section>
    <DestinationGuides onExplore={(destination) => { setSearch({ destination }); document.getElementById('explore-results')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}/>
  </main>;
}

function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [eligibleBookings, setEligibleBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState('');
  const [reviewEligibilityError, setReviewEligibilityError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const reviewSubmitting = useRef(false);
  const [focusedStop, setFocusedStop] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([endpoints.package(id), endpoints.departures(id), endpoints.reviews(id)])
      .then(([p, d, r]) => { setTrip(p.data.package || p.data); setDepartures(records(d.data)); setReviews(records(r.data)); })
      .catch((e) => setError(errorMessage(e, 'This trip could not be found.')))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { if (user) wishlist.refresh(); }, [user]);
  useEffect(() => {
    setEligibleBookings([]);
    setReviewBooking('');
    setReviewEligibilityError('');
    if (!user) return;
    let active = true;
    endpoints.pendingReviews().then(({ data }) => {
      if (!active) return;
      const eligible = records(data).filter((order) => String(order.package?._id || order.package) === String(id));
      setEligibleBookings(eligible);
      setReviewBooking(eligible.length ? String(itemId(eligible[0])) : '');
    }).catch((e) => { if (active) setReviewEligibilityError(errorMessage(e, 'Review eligibility could not be loaded.')); });
    return () => { active = false; };
  }, [id, user]);
  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewSubmitting.current) return;
    if (!rating) { setReviewError('Choose a rating before sharing your review.'); return; }
    if (reviewText.trim().length < 5) { setReviewError('Please write at least 5 characters about your journey.'); return; }
    reviewSubmitting.current = true;
    setReviewSaving(true);
    setReviewError('');
    try {
      if (editingReview) await endpoints.updateReview(itemId(editingReview), { rating, comment: reviewText.trim() });
      else await endpoints.createReview({ packageId: id, bookingId: reviewBooking, rating, comment: reviewText.trim() });
      setReviewText(''); setRating(0); setEditingReview(null); setEligibleBookings([]); setMessage('Thanks for sharing your story.');
      try {
        const [reviewResponse, tripResponse] = await Promise.all([endpoints.reviews(id), endpoints.package(id)]);
        setReviews(records(reviewResponse.data));
        setTrip(tripResponse.data.package || tripResponse.data);
      } catch (failure) { setReviewError(`Review saved, but the display could not refresh: ${errorMessage(failure)}`); }
    }
    catch (e2) { setReviewError(errorMessage(e2)); }
    finally { reviewSubmitting.current = false; setReviewSaving(false); }
  };
  const deleteReview = async (review) => {
    try {
      await endpoints.deleteReview(itemId(review));
      setReviews((old) => old.filter((x) => String(itemId(x)) !== String(itemId(review))));
      if (String(itemId(editingReview || {})) === String(itemId(review))) { setEditingReview(null); setReviewText(''); setRating(0); }
      setMessage('Your review was removed.');
      try {
        const { data } = await endpoints.pendingReviews();
        const eligible = records(data).filter((order) => String(order.package?._id || order.package) === String(id));
        setEligibleBookings(eligible);
        setReviewBooking(eligible.length ? String(itemId(eligible[0])) : '');
      } catch (failure) { setReviewEligibilityError(`Review removed, but eligibility could not be refreshed: ${errorMessage(failure)}`); }
    } catch (e) { setMessage(errorMessage(e)); }
  };
  if (loading) return <main className="page-content"><Loading/></main>;
  if (error || !trip) return <main className="content-shell page-content"><Alert>{error || 'Trip not found.'}</Alert><Link className="text-link" to="/explore">Back to explore <ArrowLeft size={15}/></Link></main>;
  const saved = wishlist.items.some((x) => String(itemId(x)) === String(itemId(trip)));
  const itinerary = trip.itinerary || trip.days || [];
  const stops = trip.stops || [];
  return <main className="journey-detail-page">
    <div className="detail-hero content-shell"><Link to="/explore" className="back-link"><ArrowLeft size={15}/> All journeys</Link><motion.div className="detail-cover" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}><img src={packageImage(trip)} alt={packageTitle(trip)}/><JourneyAtmosphere/><div className="detail-cover-label"><span><Compass size={14}/> THE ROAMORA COLLECTION</span><strong>{tripPlace(trip)}</strong></div><button data-click-spark className={`icon-button detail-save ${saved ? 'is-saved' : ''}`} aria-pressed={saved} onClick={() => user ? wishlist.toggle(trip) : navigate('/login')}><Heart fill={saved ? 'currentColor' : 'none'} size={19}/> {saved ? 'Saved' : 'Save trip'}</button></motion.div></div>
    <div className="content-shell detail-layout">
      <div className="detail-main">
        <div className="eyebrow"><MapPin size={14}/>{tripPlace(trip)} <span>·</span> {trip.travelType || trip.category || 'Curated journey'}</div>
        <h1 className="detail-title">{packageTitle(trip)}</h1>
        <div className="detail-facts"><span><Clock3 size={16}/>{trip.durationDays || trip.days || 'Flexible'} days</span><span><Users size={16}/>{trip.groupSize || trip.maxGroupSize || 'Small group'}</span><span><Star size={16} fill="currentColor"/>{trip.averageRating?.toFixed(1) || 'New'} {trip.reviewCount ? `(${trip.reviewCount} reviews)` : ''}</span></div>
        <p className="detail-description">{trip.description || 'A thoughtfully designed journey with room for the moments you never planned.'}</p>
        <section className="detail-section"><div className="eyebrow">THE GOOD BITS</div><h2>The journey, day by day.</h2>
          {itinerary.length ? <div className="itinerary-list">{itinerary.map((day, i) => <article key={day.id || i} className="itinerary-day"><span className="day-number">{String(day.day || i + 1).padStart(2, '0')}</span><div><strong>{day.title || day.name || `Day ${i + 1}`}</strong><p>{day.description || day.summary || 'A day to explore at your own pace.'}</p>{stops.filter((stop) => stop.day === day.day).map((stop, index) => <button className="stop-focus" type="button" key={`${stop.name}-${index}`} onClick={() => { setFocusedStop(stop); document.getElementById('trip-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><MapPin size={14}/>{stop.name}</button>)}</div></article>)}</div> : <p className="muted-copy">Your daily itinerary will be shared after booking.</p>}
        </section>
        <section id="trip-map" className="detail-section"><div className="eyebrow">GET YOUR BEARINGS</div><h2>Somewhere out there.</h2><TripMap stops={stops} focusedStop={focusedStop}/></section>
        <section className="detail-section reviews-section"><div className="eyebrow">KIND WORDS, REAL PEOPLE</div><h2>Notes from the road.</h2>
          {reviews.length ? <div className="review-list">{reviews.map((r, i) => {
            const reviewUserId = r.userId || r.user?.id || r.user?._id;
            const isMine = user && reviewUserId != null && String(reviewUserId) === String(user.id || user._id);
            return <article className="review-card" key={r.id || r._id || i}><div className="review-meta"><span className="avatar">{(r.user?.name || r.name || 'R').charAt(0).toUpperCase()}</span><div><strong>{r.user?.name || r.name || 'A fellow wanderer'}</strong><span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span></div><span className="rating" aria-label={`${r.rating} out of 5 stars`}><Star size={13} fill="currentColor"/>{r.rating}</span></div><p>{r.comment || r.text || r.body}</p>{isMine && <div className="review-actions"><button onClick={() => { setEditingReview(r); setRating(r.rating); setReviewText(r.comment || r.text || r.body || ''); setReviewError(''); }}>Edit</button><button onClick={() => deleteReview(r)}>Delete</button></div>}</article>;
          })}</div> : <p className="muted-copy">No reviews just yet. Take the first turn and share yours.</p>}
          {user && reviewEligibilityError && <Alert>{reviewEligibilityError}</Alert>}
          {user && !editingReview && !eligibleBookings.length && !reviewEligibilityError && <p className="muted-copy">Complete a booking to review this journey. One review per traveller and journey.</p>}
          {!user && <p className="muted-copy"><Link to="/login" state={{ from: `/trips/${id}` }}>Log in</Link> to review a completed journey.</p>}
          {reviewError && <div className="review-page-error" role="alert">{reviewError}</div>}
          {message && <p role="status">{message}</p>}
          {user && (editingReview || eligibleBookings.length > 0) && <form className="review-form" onSubmit={submitReview}>{!editingReview && <label>Completed booking <AnimatedSelect value={reviewBooking} onChange={(e) => setReviewBooking(e.target.value)}>{eligibleBookings.map((order) => <option key={itemId(order)} value={itemId(order)}>{order.bookingReference || itemId(order)} · {new Date(order.startDate).toLocaleDateString()}</option>)}</AnimatedSelect></label>}<div className="review-inline-rating"><span>Your rating{rating ? ` · ${rating} / 5` : ' · Choose a star'}</span><PeekRating value={rating} onChange={setRating} labels={['Poor', 'Fair', 'Good', 'Great', 'Exceptional']} ariaLabel="Your journey rating" activeColor="#b47e45" idleColor="#bacac0" tipColor="#294d40" size={32} allowClear={false} disabled={reviewSaving}/></div><label>Share your experience<textarea rows="3" minLength="5" maxLength="4000" placeholder="What should fellow travellers know?" value={reviewText} onChange={(e) => setReviewText(e.target.value)} required/></label><div className="review-actions"><button className="button button-dark" disabled={reviewSaving}>{reviewSaving ? 'Saving…' : editingReview ? 'Save changes' : 'Share your review'}</button>{editingReview && <button type="button" onClick={() => { setEditingReview(null); setReviewText(''); setRating(0); setReviewError(''); }}>Cancel</button>}</div></form>}
        </section>
      </div>
      <aside className="booking-card"><div className="booking-card-top"><span><Sparkles size={16}/> PLAN YOUR ESCAPE</span><span>01 / 02</span></div><div className="eyebrow">YOUR NEXT STORY</div><div className="booking-price">{money(tripPrice(trip), trip.currency || 'USD')}<small> / person</small></div><p>Choose your dates and we’ll take it from here.</p>
        <label className="field-label">Available departures<AnimatedSelect id="departure-select"><option value="">Choose a departure</option>{departures.map((d) => <option key={itemId(d)} value={itemId(d)}>{d.date ? new Date(d.date).toLocaleDateString() : d.startDate ? new Date(d.startDate).toLocaleDateString() : 'Date to be confirmed'} · {d.availableSeats ?? d.availableSpots ?? d.spots ?? 'Spots available'} seats</option>)}</AnimatedSelect></label>
        <button data-click-spark className="button button-dark button-full" onClick={() => { const departureId = document.getElementById('departure-select')?.value; if (!user) navigate('/login'); else if (!departures.length) setMessage('There are no departures available right now.'); else if (!departureId) setMessage('Choose a departure to continue.'); else navigate(`/book/${id}?departure=${departureId}`); }}>Book this journey <ArrowRight size={16}/></button>
        {message && <small className="inline-message">{message}</small>}
        <div className="booking-safe"><ShieldCheck size={16}/>Secure booking · Thoughtful support</div>
      </aside>
    </div>
  </main>;
}

const loginCredentialsSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
});
const registerCredentialsSchema = loginCredentialsSchema.extend({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  password: passwordSchema,
});

function AuthPage({ mode }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const pageRef = useRef(null);
  const register = mode === 'register';
  useEffect(() => { setError(''); }, [mode]);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.from('.auth-art', { opacity: 0, x: -24, duration: 0.65, ease: 'power2.out' });
      gsap.from('.auth-animate', { opacity: 0, y: 16, duration: 0.55, stagger: 0.07, ease: 'power2.out' });
      gsap.fromTo('.auth-art-image', { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'power2.out' });
      gsap.to('.auth-art-image', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.auth-card', start: 'top bottom', end: 'bottom top', scrub: true } });
    }, pageRef);
    return () => context.revert();
  }, [mode]);
  const finishSignIn = (user) => {
    const destination = location.state?.from;
    navigate(typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') ? destination : user.role === 'admin' ? '/admin' : '/', { replace: true });
  };
  const submit = async (e) => {
    e.preventDefault(); setError('');
    const result = (register ? registerCredentialsSchema : loginCredentialsSchema).safeParse(values);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setLoading(true);
    try { finishSignIn(await signIn(register ? 'register' : 'login', result.data)); }
    catch (e2) { setError(errorMessage(e2, 'We couldn’t sign you in. Please check your details.')); }
    finally { setLoading(false); }
  };
  const googleSignIn = async ({ credential }) => {
    if (loading) return;
    if (!credential) { setError('Google did not provide a credential. Please try again.'); return; }
    setError('');
    setLoading(true);
    try { finishSignIn(await signIn('google', { credential })); }
    catch (e) { setError(errorMessage(e, 'Google sign-in failed. Please try again.')); }
    finally { setLoading(false); }
  };
  return <main className="auth-page" ref={pageRef}><div className="auth-card"><div className="auth-art"><div className="auth-art-image" aria-hidden="true"/><div className="auth-art-top"><span className="auth-art-tag"><Compass size={15}/> YOUR NEXT CHAPTER</span><span className="auth-art-index" aria-hidden="true">ROAMORA / 01</span></div><div className="auth-art-copy"><span className="auth-art-kicker"><span/> TRAVEL BEYOND THE ORDINARY</span><h2>Somewhere<br/><em>good awaits.</em></h2><p>The world is wide open. Let’s find your way into it.</p><span className="auth-art-line"/></div><div className="auth-art-bottom"><div className="auth-art-note"><span className="auth-art-note-icon"><Plane size={17}/></span><span>YOUR JOURNEY, ALL IN ONE PLACE<strong>Dream it. Save it. Go.</strong></span></div><span className="auth-art-coords"><MapPin size={13}/> THE SWISS ALPS &nbsp; / &nbsp; 46° N</span></div></div>
    <div className="auth-form-wrap"><div className="auth-form-top auth-animate"><Link to="/" className="brand auth-brand" aria-label="Roamora home"><img src={roamoraLogo} alt="Roamora"/></Link><span>YOUR TRAVEL SPACE <Compass size={15}/></span></div><div className="auth-heading auth-animate"><div className="eyebrow"><span className="auth-heading-dot"/> {register ? 'A GOOD PLACE TO BEGIN' : 'GOOD TO HAVE YOU BACK'}</div><h1>{register ? 'Make yourself at home.' : 'Welcome back.'}</h1><p>{register ? 'Create an account and start collecting stories.' : 'Pick up right where your next adventure begins.'}</p></div>
      <form onSubmit={submit} className="stack-form auth-animate" noValidate>
        {register && <label>Full name<span className="auth-input"><UserRound size={17} aria-hidden="true"/><input autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Your name" required/></span></label>}
        <label>Email address<span className="auth-input"><Mail size={17} aria-hidden="true"/><input type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@example.com" required/></span></label>
        <label>Password<span className="auth-input"><LockKeyhole size={17} aria-hidden="true"/><input aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder={register ? 'Create a password' : 'Your password'} aria-describedby={register ? 'password-hint' : undefined} required/><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        {!register && <button type="button" className="forgot-password" onClick={() => setShowReset(true)}>Forgot password?</button>}
        {register && <p className="auth-password-hint" id="password-hint">At least 8 characters, including a lowercase letter, a number and a special character. Maximum 72 UTF-8 bytes.</p>}
        <Alert>{error}</Alert><button disabled={loading} className="button button-dark button-full">{loading ? <LoaderCircle className="spin" size={17}/> : register ? 'Create my account' : 'Log in'} {!loading && <ArrowRight size={16}/>}</button></form>
      <div className="auth-divider auth-animate"><span>or continue with</span></div>
      <div className="auth-google auth-animate" aria-busy={loading}>
        <GoogleLogin onSuccess={googleSignIn} onError={() => setError('Google sign-in failed. Please try again.')} text={register ? 'signup_with' : 'signin_with'} shape="rectangular" width="240" />
      </div>
      <div className="auth-switch auth-animate">{register ? 'Already part of the journey?' : 'New around here?'} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? 'Log in' : 'Join Roamora'} <ArrowRight size={13}/></Link></div>
    </div></div>{showReset && <PasswordResetModal initialEmail={values.email} onClose={() => setShowReset(false)}/>}</main>;
}

function Compare() {
  const [ids, setIds] = useState(() => JSON.parse(localStorage.getItem('roamora_compare') || '[]'));
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(() => ids.length > 0);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [graphTrips, setGraphTrips] = useState(null);
  const [graphError, setGraphError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metric, setMetric] = useState('duration');
  const root = useRef(null);
  const graphRequest = useRef(null);
  const pendingGraph = useRef(null);
  const remove = (id) => {
    graphRequest.current?.abort();
    graphRequest.current = null;
    pendingGraph.current = null;
    setGenerating(false);
    setGraphTrips(null);
    setGraphError('');
    const next = ids.filter((x) => String(x) !== String(id)); setIds(next); localStorage.setItem('roamora_compare', JSON.stringify(next));
  };
  useEffect(() => () => {
    graphRequest.current?.abort();
    graphRequest.current = null;
    pendingGraph.current = null;
  }, []);
  useEffect(() => {
    let active = true;
    if (!ids.length) { setTrips([]); setLoading(false); setError(''); return () => { active = false; }; }
    setLoading(true);
    setError('');
    Promise.all(ids.map((id) => endpoints.package(id).then(({ data }) => data.package || data)))
      .then((rows) => { if (active) setTrips(rows); })
      .catch((e) => { if (active) { setTrips([]); setError(errorMessage(e, 'Trips could not be loaded for comparison.')); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ids, retry]);
  useLayoutEffect(() => {
    if (loading || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.from('.compare-reveal', {
        y: 24, opacity: 0, duration: 0.65, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.compare-content', start: 'top 90%', once: true },
      });
    }, root);
    return () => context.revert();
  }, [loading, error, trips.length]);
  const generateGraph = async () => {
    const controller = new AbortController();
    graphRequest.current = controller;
    setGenerating(true);
    setProgress(0);
    setGraphError('');
    setGraphTrips(null);
    let completed = 0;
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const { data } = await endpoints.package(id, { signal: controller.signal });
        if (!controller.signal.aborted && ++completed < ids.length) setProgress(Math.round((completed / ids.length) * 100));
        return data.package || data;
      }));
      if (!controller.signal.aborted) {
        pendingGraph.current = results;
        setProgress(100);
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        controller.abort();
        graphRequest.current = null;
        setGenerating(false);
        setGraphError(errorMessage(e, 'The comparison graph could not be generated.'));
      }
    }
  };
  const finishGraph = useCallback((value) => {
    if (value !== 100 || !pendingGraph.current || !graphRequest.current || graphRequest.current.signal.aborted) return;
    setGraphTrips(pendingGraph.current);
    pendingGraph.current = null;
    graphRequest.current = null;
    setGenerating(false);
  }, []);
  const graphMetrics = {
    duration: { label: 'Trip duration', unit: 'days', detail: 'Number of days per journey', value: (trip) => trip.durationDays ?? trip.days },
    price: { label: 'Starting price', unit: '', detail: 'Starting price per person', value: tripPrice },
    rating: { label: 'Guest rating', unit: '/ 5', detail: 'Average guest rating out of 5', value: (trip) => trip.averageRating },
  };
  const selectedMetric = graphMetrics[metric];
  const currencies = graphTrips?.map((trip) => trip.currency?.toUpperCase()) || [];
  const incompatibleCurrencies = metric === 'price' && graphTrips && (currencies.some((currency) => !currency) || new Set(currencies).size !== 1);
  const graphData = (graphTrips || []).map((trip, index) => {
    const value = selectedMetric.value(trip);
    return { name: packageTitle(trip), place: tripPlace(trip), image: packageImage(trip), label: `Trip ${index + 1}`, value: typeof value === 'number' && Number.isFinite(value) && (metric === 'price' ? value >= 0 : value > 0) ? value : null };
  }).filter((trip) => trip.value !== null);
  const formatGraphValue = (value) => metric === 'price'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencies[0], currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
    : `${value} ${selectedMetric.unit}`;
  const minGraphValue = graphData.length ? Math.min(...graphData.map((trip) => trip.value)) : null;
  const maxGraphValue = graphData.length ? Math.max(...graphData.map((trip) => trip.value)) : null;
  const graphExtremes = (value) => {
    const matches = graphData.filter((trip) => trip.value === value);
    return matches.length === 1 ? matches[0].name : `${matches.length} journeys`;
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [
    { label: 'Destination', icon: MapPin, value: (t) => tripPlace(t) },
    { label: 'Travel style', icon: Compass, value: (t) => t.travelType || t.category || '—' },
    { label: 'Duration', icon: CalendarDays, value: (t) => t.durationDays || t.days ? `${t.durationDays || t.days} days` : '—' },
    { label: 'Accommodation', icon: House, value: (t) => t.accommodation || '—' },
    { label: 'Itinerary highlights', icon: Sparkles, value: (t) => (t.itinerary || []).map((day) => day.title).filter(Boolean).join(', ') || '—' },
    { label: 'What’s included', icon: Check, value: (t) => (t.included || []).join(', ') || '—' },
    { label: 'Guest rating', icon: Star, value: (t) => t.averageRating ? `★ ${Number(t.averageRating).toFixed(1)}` : 'New' },
    { label: 'Starting price', icon: Ticket, value: (t) => money(tripPrice(t), t.currency || 'USD') },
  ];
  return <CompareLayout ref={root} className="content-shell page-content">
    <section className="compare-graph" aria-labelledby="compare-title">
      <div className="compare-graph-header"><div><span className="compare-graph-kicker"><ChartNoAxesCombined size={15}/> YOUR JOURNEYS, VISUALISED</span>
        <h1 id="compare-title">See the difference.</h1><p>Turn your selected journeys into a side-by-side graph.</p></div>
        <button type="button" className="button button-dark compare-generate" disabled={loading || !!error || ids.length < 2 || generating} onClick={generateGraph}><ChartNoAxesCombined size={17}/> {generating ? 'Generating graph…' : graphTrips ? 'Refresh comparison graph' : 'Generate comparison graph'} {!generating && <ArrowRight size={16}/>}</button>
      </div>
      {!loading && ids.length < 2 && <p className="compare-graph-note">Select at least two journeys to generate a graph.</p>}
      {generating && <div className="compare-graph-loading" role="status"><CometDial value={progress} min={0} max={100} size={160} accent="var(--dial-accent, #47766c)" ink="var(--dial-ink, #294f40)" label="Comparison graph progress" onValueAnimationComplete={finishGraph} readOnly/><p>Gathering the latest journey details…</p></div>}
      {graphError && <Alert>{graphError}</Alert>}
      {graphTrips && <div className="compare-graph-result">
        <div className="compare-graph-controls"><div><h2>Journey comparison</h2><p>Based on the latest available trip details.</p></div>
          <label>Compare by <select value={metric} onChange={(event) => setMetric(event.target.value)}><option value="duration">Trip duration</option><option value="price">Starting price</option><option value="rating">Guest rating</option></select></label>
        </div>
        {incompatibleCurrencies ? <p className="compare-graph-note">Prices use different or unspecified currencies, so they cannot be compared without conversion. Choose another metric.</p> : graphData.length === 0 ? <p className="compare-graph-note">No {selectedMetric.label.toLowerCase()} data is available for these journeys.</p> : <>
          {graphData.length < graphTrips.length && <p className="compare-graph-note">Journeys without {selectedMetric.label.toLowerCase()} data are omitted.</p>}
          <div className="compare-chart-surface">
            <div className="compare-chart-title"><div><span>THE BREAKDOWN</span><h3>{selectedMetric.label}</h3></div><p>{selectedMetric.detail}{metric === 'price' ? ` · ${currencies[0]}` : ''}</p></div>
            <div className="compare-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={graphData} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
              <defs>
                <linearGradient id="compare-bar-0" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#285c4d"/><stop offset="100%" stopColor="#70a390"/></linearGradient>
                <linearGradient id="compare-bar-1" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#679b7c"/><stop offset="100%" stopColor="#bbd5bd"/></linearGradient>
                <linearGradient id="compare-bar-2" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#bd8459"/><stop offset="100%" stopColor="#e6bd8b"/></linearGradient>
              </defs>
              <CartesianGrid stroke="#dce8dd" strokeDasharray="3 5" horizontal={false}/><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#819387', fontSize: 11 }} domain={metric === 'rating' ? [0, 5] : [0, 'auto']} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}/><YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tick={{ fill: '#61796a', fontSize: 12 }} width={54}/>
              <Tooltip cursor={{ fill: 'rgba(71,118,108,.06)' }} contentStyle={{ border: '1px solid #dfe9df', borderRadius: 10, boxShadow: '0 8px 24px rgba(37,72,48,.1)' }} formatter={(value) => [formatGraphValue(value), selectedMetric.label]} labelFormatter={(label) => graphData.find((trip) => trip.label === label)?.name || label}/><Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26} isAnimationActive={!reducedMotion}>{graphData.map((trip, index) => <Cell key={trip.label} fill={`url(#compare-bar-${index % 3})`}/>)}</Bar>
            </BarChart></ResponsiveContainer></div>
          </div>
          {graphData.length > 1 && <div className="compare-insights" aria-label="Comparison range"><div><span>LOWEST</span><strong>{formatGraphValue(minGraphValue)}</strong><small>{graphExtremes(minGraphValue)}</small></div><div><span>HIGHEST</span><strong>{formatGraphValue(maxGraphValue)}</strong><small>{graphExtremes(maxGraphValue)}</small></div></div>}
          <ul className="compare-chart-key">{graphData.map((trip, index) => <li key={trip.label}><img src={trip.image} alt=""/><span className="compare-chart-trip"><small><i style={{ background: ['#47766c', '#9cbca3', '#d2a36f'][index % 3] }}/>{trip.label} · {trip.place}</small><strong>{trip.name}</strong></span><b>{formatGraphValue(trip.value)}</b></li>)}</ul>
        </>}
      </div>}
    </section>
    <section className="compare-content" aria-labelledby="compare-heading">
      <div className="compare-heading compare-reveal"><div><span>YOUR SHORTLIST</span><h2 id="compare-heading">Better together.</h2><p>All the details, in one thoughtful place.</p>{ids.length > 0 && <div className="compare-selection"><ListChecks size={14}/>{ids.length} of 3 journeys selected</div>}</div>
        {ids.length > 0 && ids.length < 3 && <Link to="/explore" className="button button-outline compare-add"><Plus size={16}/> Add a journey</Link>}
      </div>
      {loading ? <Loading label="Gathering your journeys…"/> : error ? <div className="compare-reveal"><Alert>{error}</Alert><button type="button" className="button button-outline" onClick={() => setRetry((value) => value + 1)}>Try again</button> <Link to="/explore" className="button button-quiet">Explore journeys</Link></div> : !trips.length ?
        <div className="compare-empty compare-reveal"><div className="compare-empty-icon"><ArrowLeftRight size={28}/></div><h3>Your shortlist starts here.</h3><p>Found a few places calling your name? Add up to three journeys from Explore to compare them side by side.</p><Link to="/explore" className="button button-dark">Explore journeys <ArrowRight size={16}/></Link></div> :
        <div className="compare-reveal"><p className="compare-hint">Swipe or scroll sideways to see every journey.</p>
          <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Journey comparison, scroll horizontally for more">
            <table className="comparison-table"><caption className="visually-hidden">Comparison of selected journeys</caption><thead><tr><th scope="col"><div className="compare-detail-heading"><ArrowLeftRight size={20}/><span>COMPARE<br/>THE DETAILS</span></div></th>{trips.map((t, index) => <th scope="col" key={itemId(t)}><div className="compare-trip-image"><img src={packageImage(t)} alt=""/><span className="compare-trip-number">JOURNEY 0{index + 1}</span><button type="button" className="compare-remove" aria-label={`Remove ${packageTitle(t)} from comparison`} onClick={() => remove(itemId(t))}><X size={17}/></button></div><span className="compare-trip-place"><MapPin size={12}/>{tripPlace(t)}</span><Link className="compare-trip-title" to={`/trips/${itemId(t)}`}>{packageTitle(t)} <ArrowRight size={14} aria-hidden="true"/></Link></th>)}</tr></thead>
              <tbody>{rows.map(({ label, icon: Icon, value }) => <tr key={label}><th scope="row"><span className="compare-row-label"><Icon size={16} aria-hidden="true"/>{label}</span></th>{trips.map((t) => <td key={itemId(t)} className={label === 'Starting price' ? 'compare-price' : undefined}>{value(t)}</td>)}</tr>)}
                <tr><th scope="row">Take a closer look</th>{trips.map((t) => <td key={itemId(t)}><Link className="button button-outline" to={`/trips/${itemId(t)}`}>View journey <ArrowRight size={14}/></Link></td>)}</tr>
              </tbody></table>
          </div>
        </div>}
    </section>
  </CompareLayout>;
}

function Booking() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const [trip, setTrip] = useState(null);
  const [departure, setDeparture] = useState(null);
  const [count, setCount] = useState(1);
  const [contact, setContact] = useState({ name: '', email: '' });
  const [travellers, setTravellers] = useState([{ name: '', type: 'adult' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    Promise.all([endpoints.package(id), endpoints.departures(id)]).then(([p, d]) => {
      setTrip(p.data.package || p.data);
      setDeparture(records(d.data).find((x) => String(itemId(x)) === String(search.get('departure'))) || null);
    }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [id, search]);
  useEffect(() => { setTravellers((old) => Array.from({ length: count }, (_, i) => old[i] || { name: '', type: 'adult' })); }, [count]);
  useEffect(() => { if (user) setContact((v) => ({ ...v, name: user.name || '', email: user.email || '' })); }, [user]);
  if (loading) return <main className="page-content"><Loading label="Preparing your booking…"/></main>;
  if (!trip) return <main className="content-shell page-content"><Alert>{error || 'Trip not found.'}</Alert></main>;
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!departure) { setError('There are no departures available for this trip.'); return; }
    const body = { packageId: id, departureId: itemId(departure), travellerCount: count, travellers, contact };
    const fingerprint = JSON.stringify(body);
    if (request.current && request.current.fingerprint !== fingerprint) {
      setError('The previous booking outcome is unknown. Check My trips before starting a new booking.');
      return;
    }
    if (!request.current) request.current = { fingerprint, key: idempotencyKey() };
    setSaving(true);
    try {
      const { data } = await endpoints.createOrder({ ...body, idempotencyKey: request.current.key });
      const order = data.order || data;
      navigate(`/booking/confirmation/${itemId(order)}`);
    } catch (e2) {
      if ([400, 401, 403, 404, 409, 422, 429].includes(e2.response?.status)) request.current = null;
      setError(errorMessage(e2, 'Your booking could not be completed.'));
    }
    finally { setSaving(false); }
  };
  return <main className="content-shell page-content booking-page"><Link to={`/trips/${id}`} className="back-link"><ArrowLeft size={15}/> Back to journey</Link><JourneyBanner eyebrow="MAKE IT REAL" title="Your journey starts here." copy="A few details, and you’re one step closer."><span className="journey-banner-tag"><ShieldCheck size={15}/> THOUGHTFULLY PLANNED</span></JourneyBanner>
    <form className="booking-layout" onSubmit={submit}><div className="booking-fields">
      <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Your contact</h2><p>Where should we send your trip details?</p></div></div><div className="form-grid"><label>Full name<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}/></label><label>Email address<input type="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}/></label></div></section>
      <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Who’s coming?</h2><p>Traveller details help us make this trip yours.</p></div></div><label className="count-field">Travellers <span className="counter"><button type="button" aria-label="Remove traveller" disabled={count <= 1} onClick={() => setCount((x) => x - 1)}><Minus size={14}/></button>{count}<button type="button" aria-label="Add traveller" disabled={count >= Math.min(20, departure?.availableSeats ?? 20)} onClick={() => setCount((x) => x + 1)}><Plus size={14}/></button></span></label>
        {travellers.map((person, i) => <div className="form-grid traveller-row" key={i}><label>Traveller {i + 1} name<input required value={person.name} onChange={(e) => setTravellers((rows) => rows.map((r, n) => n === i ? { ...r, name: e.target.value } : r))}/></label><label>Traveller type<AnimatedSelect value={person.type} onChange={(e) => setTravellers((rows) => rows.map((r, n) => n === i ? { ...r, type: e.target.value } : r))}><option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option></AnimatedSelect></label></div>)}
      </section>
      <Alert>{error}</Alert><button data-click-spark disabled={saving} className="button button-dark button-large">{saving ? <LoaderCircle className="spin" size={17}/> : <>Confirm booking <ArrowRight size={16}/></>}</button>
    </div><aside className="order-summary"><img src={packageImage(trip)} alt=""/><div className="eyebrow">YOUR JOURNEY</div><h3>{packageTitle(trip)}</h3><span><MapPin size={14}/>{tripPlace(trip)}</span><span><CalendarDays size={14}/>{departure?.startDate ? new Date(departure.startDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Departure unavailable'}</span><hr/><div className="summary-row"><span>{count} traveller{count > 1 ? 's' : ''}</span><strong>{departure ? money(departure.pricePerPersonMinor * count / 100, departure.currency) : 'Price unavailable'}</strong></div><small><ShieldCheck size={15}/> No payment will be collected through this website.</small></aside></form>
  </main>;
}

function Confirmation({ admin = false }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { endpoints.order(id).then(({ data }) => setOrder(data.order || data)).catch((e) => setError(errorMessage(e))); }, [id]);
  const backPath = admin ? '/admin' : '/dashboard';
  const backLabel = admin ? 'Back to admin' : 'Back to my trips';
  if (error) return <main className="content-shell page-content"><Alert>{error}</Alert><Link className="text-link" to={backPath}><ArrowLeft size={15}/> {backLabel}</Link></main>;
  if (!order) return <main className="page-content"><Loading label="Loading your booking…"/></main>;
  const trip = order.packageSnapshot || {};
  const reference = admin ? adminBookingReference(order) : order.bookingReference || id;
  const packageId = typeof order.package === 'string' ? order.package : itemId(order.package || {});
  return <main className="content-shell page-content booking-detail-page">
    <Link to={backPath} className="back-link"><ArrowLeft size={15}/> {backLabel}</Link>
    <JourneyBanner eyebrow={admin ? 'BOOKING DETAILS' : 'YOUR BOOKING'} title={admin ? 'Booking, in detail.' : 'Your journey, in detail.'} copy={admin ? 'Review this traveller’s booking details.' : 'Everything you need for this chapter, all in one place.'}>
      <span className="journey-banner-tag"><Ticket size={15}/> {reference}</span>
    </JourneyBanner>
    <div className="booking-detail-layout">
      <section className="booking-detail-main" aria-labelledby="booking-journey-title">
        <div className="booking-detail-image"><img src={packageImage(trip)} alt=""/><span className={`status-pill status-${(order.status || 'pending').toLowerCase()}`}>{order.status || 'Status unavailable'}</span></div>
        <div className="booking-detail-content"><div className="eyebrow"><MapPin size={14}/> {tripPlace(trip)}</div><h2 id="booking-journey-title">{packageTitle(trip)}</h2>
          <div className="booking-detail-facts"><div><CalendarDays size={18}/><span>DEPARTURE<strong>{journeyDate(order.startDate)}</strong></span></div><div><CalendarDays size={18}/><span>RETURN<strong>{journeyDate(order.endDate)}</strong></span></div><div><Users size={18}/><span>TRAVELLERS<strong>{order.travellerCount ?? '—'}</strong></span></div></div>
          {order.travellers?.length > 0 && <div className="booking-detail-travellers"><h3>Travellers</h3><ul>{order.travellers.map((person, index) => <li key={index}><UserRound size={16}/><span>{admin ? adminPersonName(order, person.name) : person.name}</span><small>{person.type || 'traveller'}</small></li>)}</ul></div>}
          {packageId && <Link className="text-link" to={`/trips/${packageId}`}>View journey <ArrowRight size={15}/></Link>}
        </div>
      </section>
      <aside className="booking-detail-summary"><div className="booking-summary-icon"><Ticket size={20}/></div><div className="eyebrow">BOOKING SUMMARY</div><h2>Your details.</h2><dl><div><dt>Reference</dt><dd>{reference}</dd></div><div><dt>Status</dt><dd>{order.status || 'Unavailable'}</dd></div>{order.contact?.email && <div><dt>Contact email</dt><dd>{order.contact.email}</dd></div>}<div className="booking-detail-total"><dt>Total</dt><dd>{money(order.totalMinor == null ? null : order.totalMinor / 100, order.currency || 'CAD')}</dd></div></dl>
        {order.paymentMode === 'demo' && <p><ShieldCheck size={16}/> No payment was collected through this website.</p>}
        <Link className="button button-dark button-full" to={backPath}>{admin ? 'Back to admin' : 'See my trips'} <ArrowRight size={16}/></Link>
      </aside>
    </div>
  </main>;
}

function SortableActivity({ activity, index, onRemove, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: activity.id || activity._id || `activity-${index}`, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <div className="activity-row" ref={setNodeRef} style={style}><button type="button" className="drag-handle" {...attributes} {...listeners} disabled={disabled} aria-label={`Reorder ${activity.name}`}><GripVertical size={17}/></button><span className="activity-index">{String(index + 1).padStart(2, '0')}</span><span className="activity-title"><strong>{activity.name}</strong>{activity.destination && <small><MapPin size={12}/>{activity.destination}</small>}</span>{activity.price != null && <span className="activity-price">{money(activity.price / 100, activity.currency)}<small>per person</small></span>}<button type="button" className="icon-button activity-delete" disabled={disabled} onClick={() => onRemove(index)} aria-label={`Remove ${activity.name}`}><Trash2 size={15}/></button></div>;
}

function itineraryPayload(itinerary, changes = {}) {
  const value = { ...itinerary, ...changes };
  return {
    title: value.title,
    destination: value.destination || '',
    currency: value.currency,
    travellerCount: value.travellerCount,
    source: value.source,
    days: value.days.map((day) => ({
      day: day.day,
      activities: day.activities.map((activity, sequence) => ({ activity: String(activity.activity?._id || activity.activity), sequence })),
    })),
  };
}

function Dashboard({ onRequestCancel, cancellationRevision }) {
  const { user } = useAuth();
  const [search, setSearch] = useSearchParams();
  const tab = ['trips', 'wishlist', 'itinerary'].includes(search.get('tab')) ? search.get('tab') : 'trips';
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [selected, setSelected] = useState('');
  const [catalogue, setCatalogue] = useState([]);
  const [dayNumber, setDayNumber] = useState(1);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newDestination, setNewDestination] = useState('');
  const [newCurrency, setNewCurrency] = useState('CAD');
  const [destinationDraft, setDestinationDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [destinationActivities, setDestinationActivities] = useState([]);
  const [activityQuery, setActivityQuery] = useState({ destination: '', currency: '' });
  const [activityStatus, setActivityStatus] = useState('idle');
  const [activityError, setActivityError] = useState('');
  const [activityRevision, setActivityRevision] = useState(0);
  const [savingPlan, setSavingPlan] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [removeAttempt, setRemoveAttempt] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const removing = useRef(false);
  const saving = useRef(false);
  const reduceMotion = useReducedMotion();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const load = useCallback(async () => {
    setBusy(true);
    const results = await Promise.allSettled([endpoints.orders(), endpoints.wishlist(), endpoints.itineraries(), endpoints.activities()]);
    setOrders(results[0].status === 'fulfilled' ? records(results[0].value.data) : []);
    setWishlist(results[1].status === 'fulfilled' ? records(results[1].value.data).map((x) => x.package || x) : []);
    setItineraries(results[2].status === 'fulfilled' ? records(results[2].value.data) : []);
    setCatalogue(results[3].status === 'fulfilled' ? records(results[3].value.data) : []);
    const failed = results.filter((x) => x.status === 'rejected');
    setError(failed.length ? errorMessage(failed[0].reason, 'Some of your account details could not load.') : '');
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load, cancellationRevision]);
  const current = itineraries.find((x) => String(itemId(x)) === String(selected)) || itineraries[0];
  useEffect(() => {
    if (current) {
      setSelected(String(itemId(current)));
      setDayNumber(current.days?.[0]?.day || 1);
      setDestinationDraft(current.destination || '');
      setTitleDraft(current.title || '');
    }
  }, [current?.id, current?._id]);
  useEffect(() => {
    let active = true;
    const destination = current?.destination?.trim();
    setDestinationActivities([]);
    setActivityError('');
    if (!destination) { setActivityStatus('idle'); return () => { active = false; }; }
    setActivityStatus('loading');
    endpoints.activities({ destination, match: 'exact', currency: current.currency }).then(({ data }) => {
      if (!active) return;
      const matches = records(data).filter((activity) =>
        activity.destination?.trim().toLowerCase() === destination.toLowerCase() && activity.currency === current.currency);
      setActivityQuery({ destination, currency: current.currency });
      setDestinationActivities(matches);
      setCatalogue((old) => [...new globalThis.Map([...old, ...matches].map((activity) => [String(itemId(activity)), activity])).values()]);
      setActivityStatus('ready');
    }).catch((e) => {
      if (!active) return;
      setActivityError(errorMessage(e, 'Could not load activities. Please try again.'));
      setActivityStatus('error');
    });
    return () => { active = false; };
  }, [current?.destination, current?.currency, activityRevision]);
  const currentDay = current?.days?.find((day) => day.day === dayNumber);
  const activitiesAreCurrent = activityQuery.destination === current?.destination?.trim() && activityQuery.currency === current?.currency;
  const activities = (currentDay?.activities || []).map((entry) => {
    const id = String(entry.activity?._id || entry.activity);
    const activity = catalogue.find((item) => String(itemId(item)) === id);
    return { id, name: activity?.name || `Activity ${id}`, destination: activity?.destination, price: activity?.pricePerPersonMinor, currency: activity?.currency };
  });
  const saveItinerary = async (changes) => {
    if (saving.current) throw new Error('Another change is saving. Please try again.');
    saving.current = true;
    setSavingPlan(true);
    setError('');
    setNote('');
    try {
      const { data } = await endpoints.updateItinerary(itemId(current), itineraryPayload(current, { title: titleDraft, ...changes }));
      const saved = data.itinerary;
      setItineraries((old) => old.map((it) => String(itemId(it)) === String(itemId(saved)) ? saved : it));
      return saved;
    } finally {
      saving.current = false;
      setSavingPlan(false);
    }
  };
  const createItinerary = async (event) => {
    event.preventDefault();
    const destination = newDestination.trim();
    if (!destination) { setError('Enter a destination to start your itinerary.'); return; }
    setCreatingPlan(true);
    setError('');
    setNote('');
    try {
      const { data } = await endpoints.createItinerary({ title: `${destination} itinerary`, destination, currency: newCurrency, travellerCount: 1, source: 'manual', days: [{ day: 1, activities: [] }] });
      const created = data.itinerary;
      setItineraries((x) => [...x, created]);
      setSelected(String(itemId(created)));
      setCreatingNew(false);
      setNewDestination('');
      setNote('Your itinerary was created and saved.');
    } catch (e) { setError(errorMessage(e)); }
    finally { setCreatingPlan(false); }
  };
  const saveActivities = async (next) => {
    try {
      await saveItinerary({ days: current.days.map((day) => day.day === dayNumber ? { ...day, activities: next.map((activity, sequence) => ({ activity: activity.id, sequence })) } : day) });
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  };
  const removeItinerary = async (id) => {
    try { await endpoints.deleteItinerary(id); setItineraries((old) => old.filter((x) => String(itemId(x)) !== String(id))); setSelected(''); }
    catch (e) { setError(errorMessage(e)); }
  };
  const removeCancelledTrip = async (id) => {
    if (removing.current) return;
    removing.current = true;
    setRemovingId(id);
    setError('');
    setNote('');
    try {
      await endpoints.hideOrder(id);
      setOrders((old) => old.filter((order) => String(itemId(order)) !== String(id)));
      setNote('Trip removed from My trips. Your booking record is retained.');
    } catch (e) {
      setError(errorMessage(e, 'Could not remove this trip. Please try again.'));
      setRemoveAttempt((attempt) => attempt + 1);
    } finally {
      removing.current = false;
      setRemovingId(null);
    }
  };
  return <main className="content-shell page-content dashboard-page"><JourneyBanner eyebrow="YOUR OWN LITTLE CORNER OF THE WORLD" title={`Hey, ${user?.name?.split(' ')[0] || 'there'}.`} copy="Every good story has a next chapter."><span className="journey-banner-tag"><Plane size={15}/> YOUR TRAVEL SPACE</span></JourneyBanner>
    <nav className="dashboard-tabs" aria-label="Travel dashboard">{[['trips', 'My trips', Plane], ['wishlist', 'Wishlist', Heart], ['itinerary', 'Itinerary studio', ListChecks]].map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={tab === key} className={tab === key ? 'active' : ''} onClick={() => setSearch(key === 'trips' ? {} : { tab: key })}><Icon size={16}/>{label}</button>)}</nav>
    {note && <Alert type="success" onClose={() => setNote('')}>{note}</Alert>}{error && <Alert>{error}</Alert>}
    {busy ? <Loading/> : tab === 'trips' ? orders.length ? <section className="dashboard-journeys" aria-labelledby="dashboard-trips-heading">
      <div className="dashboard-section-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2 id="dashboard-trips-heading">Journeys to remember.</h2></div><span>{orders.length} {orders.length === 1 ? 'booking' : 'bookings'}</span></div>
      <div className="orders-list">{orders.map((order) => {
        const trip = order.packageSnapshot || {};
        const oid = itemId(order);
        const status = (order.status || '').toLowerCase();
        return <motion.article className="order-card" key={oid} whileHover={reduceMotion ? undefined : { y: -3 }} transition={{ duration: .2 }}>
          <img src={packageImage(trip)} alt=""/>
          <div className="order-main"><span className={`status-pill status-${status || 'pending'}`}>{order.status || 'Pending'}</span><h3>{packageTitle(trip)}</h3><p><MapPin size={14}/>{tripPlace(trip)}</p><p><CalendarDays size={14}/>{order.startDate ? new Date(order.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Date to be confirmed'} <span>·</span> {order.travellerCount || 1} traveller{order.travellerCount > 1 ? 's' : ''}</p></div>
          <div className="order-actions">
            <span>BOOKING TOTAL</span><strong>{money(order.totalMinor == null ? null : order.totalMinor / 100, order.currency || 'CAD')}</strong>
            <Link to={`/booking/confirmation/${oid}`} className="text-link">View details <ArrowRight size={14}/></Link>
            {status === 'cancelled' ? <div className="remove-trip-actions">
              <HoldButton key={`${oid}-${removeAttempt}`} className="remove-trip-hold" size="sm" radius={9} icon={<Trash2 size={14}/>}
                backgroundColor="var(--remove-trip-bg)" fillColor="var(--remove-trip-fill)" textColor="var(--remove-trip-text)"
                doneLabel="Removing…" disabled={removingId !== null} onHold={() => removeCancelledTrip(oid)}>Hold to remove</HoldButton>
              <button type="button" className="remove-trip-confirm" disabled={removingId !== null}
                onClick={() => setConfirmation({ title: 'Remove this trip?', description: 'Remove this cancelled trip from My trips? Your booking record will be kept.', confirmLabel: 'Remove trip', action: () => removeCancelledTrip(oid) })}>Or confirm removal</button>
            </div> : !['complete', 'completed'].includes(status) && <button type="button" data-click-spark onClick={() => onRequestCancel({ id: oid, title: packageTitle(trip), reference: order.bookingReference, date: order.startDate })} className="cancel-link"><Trash2 size={13}/> Cancel booking</button>}
          </div>
        </motion.article>;
      })}</div>
    </section> : <EmptyState title="Your trips will live here." copy="Book a journey and we’ll keep all your details close at hand." action={<Link to="/explore" className="button button-dark">Explore journeys <ArrowRight size={15}/></Link>}/>
      : tab === 'wishlist' ? wishlist.length ? <div className="trip-grid">{wishlist.map((trip) => <TripCard key={itemId(trip)} trip={trip} saved onWishlist={async (x) => { try { await endpoints.removeWishlist(itemId(x)); setWishlist((old) => old.filter((t) => String(itemId(t)) !== String(itemId(x)))); } catch (e) { setError(errorMessage(e)); } }}/>)}</div> : <EmptyState icon={Heart} title="Keep the ones that call to you." copy="Save a few journeys, then come back when you’re ready." action={<Link to="/explore" className="button button-dark">Find a journey <ArrowRight size={15}/></Link>}/>
      : <motion.section className="itinerary-studio" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} aria-labelledby="studio-title">
        <div className="studio-heading"><div><div className="studio-kicker"><Compass size={15}/> YOUR TRAVEL DESIGN STUDIO</div><h2 id="studio-title">Dream it.<br/><em>Then map it.</em></h2><p>A little space for the places, plans and moments still to come.</p></div><div className="studio-heading-action"><span>YOUR NEXT CHAPTER / 01</span>{current && !creatingNew && <button type="button" className="button button-dark" disabled={savingPlan} onClick={() => { setCreatingNew(true); setError(''); setNote(''); }}><Plus size={15}/> New itinerary</button>}</div></div>
        <datalist id="studio-destinations">{[...new Set(catalogue.map((activity) => activity.destination).filter(Boolean))].sort().map((destination) => <option value={destination} key={destination}/>)}</datalist>
        {!current || creatingNew ? <div className="studio-empty studio-start"><span className="studio-empty-icon"><MapPin size={25}/></span><div className="eyebrow">FIRST, PICK A PLACE</div><h3>Where would you like to go?</h3><p>Choose your destination and currency to discover available activities for your journey.</p><form className="studio-start-form" onSubmit={createItinerary}><label>DESTINATION<input list="studio-destinations" required maxLength={120} value={newDestination} onChange={(e) => setNewDestination(e.target.value)} placeholder="e.g. Paris" /></label><label>CURRENCY<select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)}><option value="CAD">CAD</option><option value="USD">USD</option></select></label><button type="submit" className="button button-dark" disabled={creatingPlan}>{creatingPlan ? 'Creating…' : <>Start planning <ArrowRight size={15}/></>}</button>{current && <button type="button" className="studio-cancel" disabled={creatingPlan} onClick={() => setCreatingNew(false)}>Back to my itinerary</button>}</form><small>Suggestions come from our catalogue; you can also type a destination.</small></div> : <div className="studio-layout">
          <aside className="studio-sidebar"><div className="studio-picker"><label>YOUR ITINERARIES<AnimatedSelect aria-label="Choose itinerary" disabled={savingPlan} value={String(itemId(current || {}))} onChange={(e) => setSelected(e.target.value)}>{itineraries.map((it) => <option key={itemId(it)} value={itemId(it)}>{it.title || it.name || 'Untitled itinerary'}</option>)}</AnimatedSelect></label><button type="button" className="icon-button" disabled={savingPlan} aria-label="Delete itinerary" onClick={() => removeItinerary(itemId(current))}><Trash2 size={16}/></button></div>
            <div className="studio-postcard"><img src={packageImage({ destination: current.destination })} alt=""/><div className="studio-postcard-overlay"><span><Sparkles size={14}/> FIELD NOTES</span><div><small>YOUR NEXT ADVENTURE</small><strong>{current.destination || 'Somewhere wonderful.'}</strong><p>Make space for the unexpected.</p></div></div></div>
            <form className="studio-destination" onSubmit={async (e) => { e.preventDefault(); const destination = destinationDraft.trim(); if (!destination) { setError('Enter a destination to find activities.'); return; } try { await saveItinerary({ destination }); setDestinationDraft(destination); setNote('Destination saved. Existing stops were kept.'); } catch (error) { setError(errorMessage(error)); } }}><label>DESTINATION<input list="studio-destinations" required maxLength={120} value={destinationDraft} disabled={savingPlan} onChange={(e) => setDestinationDraft(e.target.value)} placeholder="Where are you going?"/></label><button type="submit" disabled={savingPlan || destinationDraft.trim() === (current.destination || '').trim()}>{current.destination ? 'Update destination' : 'Set destination'}</button><small>Changing the destination keeps your existing stops.</small></form>
            <div className="studio-summary"><div><span>THE PLAN</span><strong>{current.days.length} {current.days.length === 1 ? 'day' : 'days'}</strong></div><div><span>THE DETAILS</span><strong>{current.days.reduce((total, day) => total + day.activities.length, 0)} stops</strong></div><div><span>CURRENCY</span><strong>{current.currency}</strong></div></div>
            {current.estimatedActivitiesTotalMinor != null && <div className="studio-estimate"><span>ESTIMATED ACTIVITY COST</span><strong>{money(current.estimatedActivitiesTotalMinor / 100, current.currency)}</strong><small>Catalogue activities for {current.travellerCount} traveller{current.travellerCount === 1 ? '' : 's'}. Excludes accommodation, transport and unlisted meals.</small></div>}
          </aside>
          <div className="studio-board"><div className="studio-board-head"><div className="studio-board-heading"><span className="studio-board-kicker"><span/> YOUR ITINERARY</span><input aria-label="Itinerary title" maxLength={180} disabled={savingPlan} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onBlur={(e) => { if (titleDraft !== current.title && !e.relatedTarget?.closest('.studio-save-button, .studio-add-day, .studio-discovery-add, .activity-delete, .studio-destination button')) saveItinerary({}).catch((error) => setError(errorMessage(error))); }}/><small>Changes save as you plan. You can also save anytime.</small></div><button type="button" className="button button-dark studio-save-button" disabled={savingPlan} onClick={async () => { try { await saveItinerary({}); setNote('Itinerary saved.'); } catch (error) { setError(errorMessage(error)); } }}>{savingPlan ? 'Saving…' : <><Check size={15}/> Save itinerary</>}</button></div>
            <div className="studio-days"><div className="studio-section-heading"><div><div className="eyebrow">THE BIG PICTURE</div><h3>Day by day.</h3></div><button type="button" className="studio-add-day" disabled={savingPlan || current.days.length >= 60} onClick={async () => { const day = Math.max(0, ...current.days.map((entry) => entry.day)) + 1; try { await saveItinerary({ days: [...current.days, { day, activities: [] }] }); setDayNumber(day); } catch (e) { setError(errorMessage(e)); } }}><Plus size={14}/> Add day</button></div>
              <div className="studio-day-list" role="group" aria-label="Choose a day">{current.days.map((day) => <button type="button" key={day.day} disabled={savingPlan} aria-pressed={dayNumber === day.day} className={dayNumber === day.day ? 'active' : ''} onClick={() => setDayNumber(day.day)}><span>DAY</span><strong>{String(day.day).padStart(2, '0')}</strong><small>{day.activities.length} {day.activities.length === 1 ? 'stop' : 'stops'}</small></button>)}</div></div>
            <div className="studio-stops"><div className="studio-section-heading"><div><div className="eyebrow">THE LITTLE DETAILS</div><h3>Day {dayNumber} <span> / {activities.length} {activities.length === 1 ? 'stop' : 'stops'}</span></h3></div><span className="studio-reorder-hint"><GripVertical size={15}/> Drag or use keyboard to reorder</span></div>
              {activities.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const from = activities.findIndex((a, i) => String(a.id || a._id || `activity-${i}`) === String(active.id)); const to = activities.findIndex((a, i) => String(a.id || a._id || `activity-${i}`) === String(over.id)); if (from >= 0 && to >= 0) saveActivities(arrayMove(activities, from, to)); }}>
                <SortableContext items={activities.map((a, i) => a.id || a._id || `activity-${i}`)} strategy={verticalListSortingStrategy}>{activities.map((act, i) => <SortableActivity key={act.id || act._id || `activity-${i}`} activity={act} index={i} disabled={savingPlan} onRemove={(index) => saveActivities(activities.filter((_, n) => n !== index))}/>)}</SortableContext>
              </DndContext> : <div className="studio-day-empty"><span><MapPin size={18}/></span><div><strong>Nothing planned just yet.</strong><p>Choose an activity below to add your first stop.</p></div></div>}
              <section className="studio-discover" aria-labelledby="studio-discover-title"><div className="studio-section-heading"><div><div className="eyebrow">EXPLORE THE POSSIBILITIES</div><h3 id="studio-discover-title">Things to do{current.destination ? ` in ${current.destination}` : ''}.</h3></div></div><p>Available catalogue activities in {current.currency}, priced per person. Add them to day {dayNumber}.</p>
                {!current.destination?.trim() ? <div className="studio-discover-message">Set a destination to discover activities. Your existing stops will stay as they are.</div> : activityStatus === 'error' ? <div className="studio-discover-message" role="alert">{activityError} <button type="button" onClick={() => setActivityRevision((x) => x + 1)}>Try again</button></div> : activityStatus === 'loading' || !activitiesAreCurrent ? <p role="status">Finding activities…</p> : !destinationActivities.length ? <div className="studio-discover-message">No catalogue activities priced in {current.currency} were found for {current.destination}. Try another destination or currency in a new itinerary.</div> : <><div className="studio-activity-list">{destinationActivities.map((activity) => {
                  const id = String(itemId(activity));
                  const added = activities.some((entry) => entry.id === id);
                  return <article className="studio-discovery-card" key={id}><div><span className="studio-discovery-location"><MapPin size={12}/>{activity.destination}{activity.country ? `, ${activity.country}` : ''}</span><h4>{activity.name}</h4>{activity.description && <p>{activity.description}</p>}<div className="studio-discovery-meta">{activity.durationMinutes != null && <span><Clock3 size={13}/>{activity.durationMinutes} min</span>}<strong>{money(activity.pricePerPersonMinor == null ? null : activity.pricePerPersonMinor / 100, activity.currency)} <small>per person</small></strong></div></div><button type="button" className="studio-discovery-add" disabled={savingPlan || added || !currentDay} onClick={() => saveActivities([...activities, { id, name: activity.name }])}>{added ? <><Check size={14}/> Added</> : <><Plus size={14}/> Add to day {dayNumber}</>}</button></article>;
                })}</div>{destinationActivities.length === 200 && <small className="studio-discovery-limit">Showing the first 200 matching activities.</small>}</>}
              </section>
            </div><div className="studio-travo"><span><Sparkles size={17}/></span><div><strong>Need a little inspiration?</strong><p>Travo can help you dream up what comes next.</p></div><Link to="/travo">Chat with Travo <ArrowRight size={15}/></Link></div>
          </div>
        </div>}
      </motion.section>}
    {confirmation && <ConfirmDialog {...confirmation} onClose={() => setConfirmation(null)} onConfirm={() => { const action = confirmation.action; setConfirmation(null); action(); }}/>}
  </main>;
}

function AdminBarChart({ title, description, data, valueLabel, formatValue = (value) => value, emptyMessage }) {
  const reduceMotion = useReducedMotion();
  return <section className="chart-card admin-chart-card">
    <div className="admin-chart-heading"><div><div className="eyebrow">THE BREAKDOWN</div><h2>{title}</h2><p>{description}</p></div><span className="admin-section-mark"><ChartNoAxesCombined size={18}/></span></div>
    {data.length ? <>
      <div className="admin-bar-chart" style={{ height: Math.max(150, data.length * 38 + 32) }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dce8dd" strokeDasharray="3 5" horizontal={false}/>
          <XAxis type="number" allowDecimals={valueLabel !== 'Net payments'} tickLine={false} axisLine={false} tick={{ fill: '#788f81', fontSize: 11 }}/>
          <YAxis dataKey="label" type="category" width={105} tickLine={false} axisLine={false} tick={{ fill: '#788f81', fontSize: 11 }} tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 14)}…` : value}/>
          <Tooltip cursor={{ fill: 'rgba(71,118,108,.08)' }} contentStyle={{ color: '#244e42', border: '1px solid #dfe9df', borderRadius: 10 }} formatter={(value) => [formatValue(value), valueLabel]}/>
          <Bar dataKey="value" fill="#47766c" radius={[0, 6, 6, 0]} maxBarSize={24} isAnimationActive={!reduceMotion}/>
        </BarChart></ResponsiveContainer>
      </div>
      <details className="admin-chart-details"><summary>View chart values</summary><ul>{data.map(({ label, value }, index) => <li key={`${label}-${index}`}><span>{label}</span><strong>{formatValue(value)}</strong></li>)}</ul></details>
    </> : <div className="chart-empty"><ChartNoAxesCombined size={21}/><span>{emptyMessage}</span></div>}
  </section>;
}

function Admin() {
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState([]);
  const nextNoticeId = useRef(0);
  const notify = (message) => {
    const id = ++nextNoticeId.current;
    setNotices((current) => [...current, { id, message }]);
  };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [originalPackage, setOriginalPackage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewEmailBusy, setReviewEmailBusy] = useState('');
  const reduceMotion = useReducedMotion();
  const loadSequence = useRef(0);
  const tabs = [
    { key: 'overview', label: 'Overview', icon: ChartNoAxesCombined, description: 'The big picture' },
    { key: 'packages', label: 'Journeys', icon: Package, description: 'Your travel collection' },
    { key: 'departures', label: 'Departures', icon: CalendarDays, description: 'Dates and availability' },
    { key: 'orders', label: 'Bookings', icon: Ticket, description: 'Traveller reservations' },
    { key: 'users', label: 'Travellers', icon: Users, description: 'Accounts and access' },
    { key: 'reviews', label: 'Reviews', icon: MessageSquareText, description: 'Stories from the road' },
  ];
  const activeSection = tabs.find((item) => item.key === tab);
  const destinationData = (analytics?.bookingsByDestination || []).map((item) => ({ label: item._id?.trim() || 'Unknown destination', value: item.bookings }));
  const customerData = (analytics?.customersByCountry || []).map((item) => ({ label: item._id?.trim() || 'Country not provided', value: item.customers }));
  const revenueByCurrency = (analytics?.revenue || []).reduce((groups, item) => {
    if (!groups[item.currency]) groups[item.currency] = [];
    groups[item.currency].push({ label: item.period, value: item.netMinor / 100 });
    return groups;
  }, {});
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError('');
    try {
      if (tab === 'overview') { const { data } = await endpoints.analytics(); if (sequence === loadSequence.current) setAnalytics(data); }
      else {
        const get = { packages: endpoints.adminPackages, departures: endpoints.adminDepartures, orders: endpoints.adminOrders, users: endpoints.adminUsers, reviews: endpoints.adminReviews }[tab];
        const { data } = await get(); if (sequence === loadSequence.current) setRows(records(data));
      }
    } catch (e) { if (sequence === loadSequence.current) setError(errorMessage(e, 'Admin data could not be loaded.')); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [tab]);
  useEffect(() => { setRows([]); if (tab === 'overview') setAnalytics(null); load(); return () => { loadSequence.current += 1; }; }, [load, tab]);
  const submitPackage = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      let image = uploadedImage;
      if (imageFile) {
        const { data } = await endpoints.uploadPackageImage(imageFile);
        image = data.url;
        setUploadedImage(image);
        setImageFile(null);
      }
      const body = {
        ...originalPackage,
        ...form,
        images: image ? [image, ...(originalPackage?.images || [])] : (originalPackage?.images || []),
        pricePerPersonMinor: Math.round(Number(form.price) * 100),
        durationDays: Number(form.durationDays),
        nights: Number(form.nights),
        cancellationPolicy: {
          freeCancellationDaysBefore: Number(form.freeCancellationDaysBefore),
          refundPercent: Number(form.refundPercent),
        },
      };
      if (editing) await endpoints.updatePackage(editing, body); else await endpoints.createPackage(body);
      notify(editing ? 'Journey updated.' : 'Journey created.'); setShowForm(false); setEditing(null); await load();
    } catch (e2) { setError(errorMessage(e2)); }
    finally { setSaving(false); }
  };
  const deletePackage = async (id) => {
    try { await endpoints.deletePackage(id); notify('Journey archived.'); await load(); }
    catch (e) { setError(errorMessage(e)); }
  };
  const deleteReview = async (id) => {
    try { await endpoints.deleteReview(id); setRows((old) => old.filter((x) => String(itemId(x)) !== String(id))); notify('Review deleted.'); }
    catch (e) { setError(errorMessage(e)); }
  };
  const completeOrder = async (id) => {
    setError('');
    try {
      const { data } = await endpoints.completeOrder(id);
      await load();
      if (data.order.reviewEmailStatus === 'sent') notify('Booking completed and review email sent.');
      else if (data.order.reviewEmailStatus === 'not_needed') notify('Booking completed. This journey has already been reviewed.');
      else { notify('Booking completed.'); setError(`Review email was ${data.order.reviewEmailStatus === 'not_configured' ? 'not sent because SMTP is not configured' : 'not sent'}. You can retry it from this booking.`); }
    }
    catch (e) { setError(`Could not confirm completion. Refresh the bookings list before trying again. ${errorMessage(e)}`); }
  };
  const retryReviewEmail = async (id) => {
    if (reviewEmailBusy) return;
    setReviewEmailBusy(id);
    setError('');
    try {
      const { data } = await endpoints.retryReviewEmail(id);
      await load();
      if (data.order.reviewEmailStatus === 'sent') notify('Review email sent.');
      else if (data.order.reviewEmailStatus === 'not_needed') notify('This journey has already been reviewed; no email was sent.');
      else setError(`Review email was ${data.order.reviewEmailStatus === 'not_configured' ? 'not sent because SMTP is not configured' : 'not sent'}.`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setReviewEmailBusy(''); }
  };
  const promoteUser = async (id) => {
    try { await endpoints.promoteUser(id); notify('Administrator access granted.'); await load(); }
    catch (e) { setError(errorMessage(e)); }
  };
  return <main className="content-shell page-content admin-page"><motion.div className="admin-heading" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}><div><div className="eyebrow">THE ROAMORA CONTROL ROOM <span> / </span> ADMINISTRATION</div><h1>Everything in<br/><em>its place.</em></h1><p>A calmer way to manage the journeys, bookings and people behind every adventure.</p></div><div className="admin-heading-aside"><span className="admin-badge"><ShieldCheck size={15}/> Private workspace</span><Compass size={64} strokeWidth={0.8} aria-hidden="true"/><small>MADE FOR THE JOURNEY</small></div></motion.div>
    <div className="admin-workspace">
    <nav className="admin-tabs" aria-label="Admin sections"><div className="admin-nav-label">YOUR WORKSPACE <span>01 — 06</span></div>{tabs.map(({ key, label, icon: Icon, description }) => <button type="button" disabled={saving} aria-pressed={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => { setTab(key); setShowForm(false); }}><span className="admin-nav-icon"><Icon size={17}/></span><span className="admin-nav-copy"><strong>{label}</strong><small>{description}</small></span><ArrowRight className="admin-nav-arrow" size={15}/></button>)}<div className="admin-nav-foot"><ShieldCheck size={15}/> Authorized access only</div></nav>
    <motion.div key={tab} className="admin-workspace-content" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    {error && <Alert>{error}</Alert>}
    {loading ? <Loading/> : tab === 'overview' ? analytics && <div className="admin-overview"><div className="admin-section-intro"><div><div className="eyebrow">YOUR BUSINESS AT A GLANCE</div><h2>The overview.</h2><p>Bookings, journeys and travellers at a glance.</p></div><span className="admin-section-mark"><Sparkles size={18}/></span></div><div className="metric-grid">{[['Confirmed & completed', analytics?.metrics?.confirmedBookings ?? '—', 'Confirmed or completed bookings', Ticket], ['Active journeys', analytics?.metrics?.activePackages ?? '—', 'Currently active journeys', Package], ['Travellers', analytics?.metrics?.customers ?? '—', 'Customer accounts', Users], ['Revenue', analytics?.metrics?.netExternalPayments && analytics.metrics.netExternalPayments.length ? money(analytics.metrics.netExternalPayments.reduce((sum, { netMinor }) => sum + (netMinor ?? 0), 0) / 100, analytics.metrics.netExternalPayments[0]?.currency || 'CAD') : '—', 'Net external payments', Ticket]].map(([label, value, detail, Icon]) => <div key={label} className="metric-card"><div className="admin-metric-top"><span>{label}</span><span className="admin-metric-icon"><Icon size={17}/></span></div><strong>{value}</strong><small>{detail}</small></div>)}</div>
      <div className="admin-chart-grid">
        <AdminBarChart title="Bookings by destination" description="Top destinations for confirmed and completed bookings, all time." data={destinationData} valueLabel="Bookings" emptyMessage="Confirmed and completed bookings will appear here."/>
        <AdminBarChart title="Customers by country" description="Top countries for customer accounts, all time. Missing countries are included." data={customerData} valueLabel="Customers" emptyMessage="Customer accounts will appear here."/>
      </div>
      <div className="chart-card admin-payments"><div><div className="eyebrow">PAYMENT OVERVIEW</div><h2>Recorded external payments</h2><p>Totals reflect recorded external payments, less recorded refunds, and are not independently verified with a payment provider.</p></div>{analytics?.metrics?.netExternalPayments?.length ? <div className="admin-payment-totals">{analytics.metrics.netExternalPayments.map(({ currency, netMinor }) => <div key={currency}><span>{currency}</span><strong>{money(netMinor / 100, currency)}</strong></div>)}</div> : <div className="chart-empty"><ShieldCheck size={21}/><strong>No external payments recorded yet</strong><span>Only recorded external payments are included in these totals.</span></div>}</div>
      {Object.keys(revenueByCurrency).length ? <div className="admin-chart-grid">{Object.entries(revenueByCurrency).map(([currency, data]) => <AdminBarChart key={currency} title={`Net payments · ${currency}`} description="Recorded external payments less recorded refunds by month, this year through today." data={data} valueLabel="Net payments" formatValue={(value) => money(value, currency)}/>)}</div> : <AdminBarChart title="Net payments by month" description="Recorded external payments less recorded refunds, this year through today. Currencies are shown separately." data={[]} valueLabel="Net payments" emptyMessage="No external payment activity recorded for this year."/>}
      <div className="admin-recent"><div className="admin-recent-heading"><div><div className="eyebrow">LATEST ACTIVITY</div><h2>Recent bookings.</h2><p>Most recent booking records.</p></div><button type="button" onClick={() => setTab('orders')}>View all <ArrowRight size={15}/></button></div>{analytics?.recentOrders?.length ? <div className="admin-recent-list">{analytics.recentOrders.map((order) => <Link key={itemId(order)} to={`/admin/orders/${itemId(order)}`} className="admin-recent-row"><span className="admin-recent-icon"><Ticket size={17}/></span><span className="admin-recent-name"><strong>{order.packageSnapshot?.title || 'Journey'}</strong><small>{adminBookingReference(order)} · {adminPersonName(order, order.contact?.name) || 'Traveller'}</small></span><span className={`status-pill status-${(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span><ArrowRight size={15}/></Link>)}</div> : <div className="admin-recent-empty">New bookings will appear here.</div>}</div></div>
      : <section className="admin-list-section"><div className="admin-list-heading"><div><div className="eyebrow">YOUR WORKSPACE / {activeSection.label.toUpperCase()}</div><h2>{activeSection.label}.</h2><p>{activeSection.description}. <span>{rows.length} {rows.length === 1 ? 'record' : 'records'} shown</span></p></div>{tab === 'packages' && <button className="button button-dark" disabled={saving} onClick={() => { setEditing(null); setOriginalPackage(null); setImageFile(null); setUploadedImage(''); setForm({ title: '', slug: '', country: '', destination: '', description: '', price: '', durationDays: '', nights: '', travelType: '', currency: 'CAD', freeCancellationDaysBefore: 0, refundPercent: 0 }); setShowForm(!showForm); }}><Plus size={15}/> Add journey</button>}</div>
        {tab === 'departures' && <div className="admin-departure-create"><DepartureCreate onCreated={() => { notify('Departure created.'); load(); }}/></div>}
        {showForm && <form className="admin-edit-form" onSubmit={submitPackage}><h3>{editing ? 'Edit journey' : 'New journey'}</h3><div className="form-grid">{[['title','Title'],['slug','Slug (lowercase, hyphenated)'],['destination','Destination'],['country','Country'],['travelType','Travel style'],['currency','Currency']].map(([key,label]) => <label key={key}>{label}<input required value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></label>)}{[['price','Price per person','0','0.01'],['durationDays','Duration (days)','1','1'],['nights','Nights','0','1'],['freeCancellationDaysBefore','Free cancellation days before','0','1'],['refundPercent','Refund percent','0','1']].map(([key,label,min,step]) => <label key={key}>{label}<input required type="number" min={min} max={key === 'refundPercent' ? 100 : undefined} step={step} value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></label>)}<label className="span-two">Description<textarea required rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><label className="span-two">Journey image <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setImageFile(e.target.files?.[0] || null); setUploadedImage(''); }}/><small>JPEG, PNG or WebP, up to 5 MB. Uploaded when you save.</small>{uploadedImage && <small>Image uploaded and ready to save.</small>}</label></div><div className="form-actions"><button type="button" className="button button-outline" disabled={saving} onClick={() => setShowForm(false)}>Cancel</button><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create journey'}</button></div></form>}
        {!rows.length ? !error && <EmptyState title={`No ${activeSection.label.toLowerCase()} yet.`} copy="When records are available, they'll show up here."/> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{(tab === 'packages' ? ['Journey', 'Destination', 'Price', 'Duration', 'Actions'] : tab === 'departures' ? ['Departure', 'Journey', 'Date', 'Seats', 'Actions'] : tab === 'orders' ? ['Order', 'Traveller', 'Status', 'Booking value', 'Actions'] : tab === 'users' ? ['Name', 'Email', 'Role', 'Joined'] : ['Review', 'Traveller', 'Rating', 'Actions']).map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row) => {
          const id = itemId(row);
          if (tab === 'packages') return <tr key={id}><td data-label="Journey"><div className="admin-journey-cell"><img src={packageImage(row)} alt=""/><span><strong>{packageTitle(row)}</strong><small className="admin-cell-detail">{row.travelType || 'Journey'} · {row.status || 'active'}</small></span></div></td><td data-label="Destination">{tripPlace(row)}</td><td data-label="Price">{money(tripPrice(row), row.currency || 'USD')}</td><td data-label="Duration">{row.durationDays || row.days || '—'} days</td><td data-label="Actions"><div className="table-actions"><button disabled={saving} onClick={() => { setEditing(id); setOriginalPackage(row); setImageFile(null); setUploadedImage(''); setForm({ title: row.title, slug: row.slug, destination: row.destination, country: row.country, description: row.description, price: tripPrice(row), durationDays: row.durationDays, nights: row.nights, travelType: row.travelType, currency: row.currency, freeCancellationDaysBefore: row.cancellationPolicy?.freeCancellationDaysBefore ?? 0, refundPercent: row.cancellationPolicy?.refundPercent ?? 0 }); setShowForm(true); }}>Edit</button><button disabled={saving} onClick={() => setConfirmation({ title: 'Archive this journey?', description: 'It will no longer appear in public listings.', confirmLabel: 'Archive journey', action: () => deletePackage(id) })}>Archive</button></div></td></tr>;
          if (tab === 'departures') return <tr key={id}><td data-label="Departure"><strong>{String(id).slice(-8).toUpperCase()}</strong><small className={`admin-cell-detail status-${(row.status || 'scheduled').toLowerCase()}`}>{row.status || 'Scheduled'}</small></td><td data-label="Journey">{packageTitle(row.package || row)}</td><td data-label="Date">{row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'}</td><td data-label="Seats">{row.availableSeats ?? '—'}{row.capacity != null && <small className="admin-cell-detail">of {row.capacity} available</small>}</td><td data-label="Actions"><DepartureActions row={row} onChanged={() => { notify('Departure updated.'); load(); }} onError={setError}/></td></tr>;
          if (tab === 'orders') return <tr key={id}><td data-label="Order"><strong>{adminBookingReference(row)}</strong><small className="admin-cell-detail">{row.packageSnapshot?.title || 'Journey'}</small></td><td data-label="Traveller">{adminPersonName(row, row.contact?.name) || adminPersonName(row.user, row.user?.name) || '—'}</td><td data-label="Status"><span className={`status-pill status-${(row.status || 'pending').toLowerCase()}`}>{row.status || 'Pending'}</span>{row.status === 'completed' && <small className="admin-cell-detail">Review email: {row.reviewEmailStatus === 'sent' ? 'sent' : row.reviewEmailStatus === 'not_needed' ? 'already reviewed' : row.reviewEmailStatus === 'pending' ? 'sending or awaiting retry' : row.reviewEmailStatus === 'failed' ? 'failed' : row.reviewEmailStatus === 'not_configured' ? 'SMTP not configured' : 'not recorded'}</small>}</td><td data-label="Booking value">{money(row.totalMinor == null ? null : row.totalMinor / 100, row.currency || 'CAD')}<small className="admin-cell-detail">{row.paymentMode === 'demo' ? 'No payment collected' : 'Booking value'}</small></td><td data-label="Actions"><div className="admin-row-actions"><Link to={`/admin/orders/${id}`}>View details</Link>{row.status === 'confirmed' && <button onClick={() => setConfirmation({ title: 'Complete this booking?', description: 'The booking will be marked completed and a review request will be sent to its contact email unless the journey was already reviewed.', confirmLabel: 'Mark completed', action: () => completeOrder(id) })}>Mark completed</button>}{row.status === 'completed' && !['sent', 'not_needed'].includes(row.reviewEmailStatus) && <button disabled={Boolean(reviewEmailBusy)} onClick={() => retryReviewEmail(id)}>{reviewEmailBusy === id ? 'Sending…' : 'Retry review email'}</button>}</div></td></tr>;
          if (tab === 'users') return <tr key={id}><td data-label="Name"><div className="admin-person"><span className="admin-person-avatar">{(adminPersonName(row, row.name) || 'T').charAt(0).toUpperCase()}</span><strong>{adminPersonName(row, row.name) || '—'}</strong></div></td><td data-label="Email">{row.email || '—'}</td><td data-label="Role"><select disabled={saving} value={row.role || 'user'} onChange={(e) => { if (e.target.value !== row.role) setConfirmation({ title: `Change role to ${e.target.value}?`, description: `${adminPersonName(row, row.name) || row.email} will receive updated access permissions.`, confirmLabel: `Change to ${e.target.value}`, action: () => promoteUser(id, e.target.value) }); }} className="admin-role-dropdown"><option value="user">user</option><option value="admin" disabled={row.isActive === false}>admin</option></select></td><td data-label="Joined">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td></tr>;
          return <tr key={id}><td data-label="Review"><strong>{row.comment || row.text || '—'}</strong><small className="admin-cell-detail">{row.package?.title || 'Journey'}</small></td><td data-label="Traveller">{adminPersonName(row.user, row.user?.name) || row.name || '—'}</td><td data-label="Rating"><span className="rating"><Star size={13} fill="currentColor"/>{row.rating || '—'}</span></td><td data-label="Actions"><button className="table-action" onClick={() => setConfirmation({ title: 'Delete this review?', description: 'This will remove the review.', confirmLabel: 'Delete review', action: () => deleteReview(id) })}>Delete</button></td></tr>;
        })}</tbody></table></div>}
      </section>}
    </motion.div></div>
    {notices.length > 0 && <div className="admin-toast-stack" aria-label="Admin notifications">{notices.map(({ id, message }) => <SwipeToast key={id} title={message} icon={<Check size={18}/>} background="#244e42" color="#f5fff8" fuseColor="#a5dfbd" radius={14} duration={6000} closeButton inline onClose={() => setNotices((current) => current.filter((notice) => notice.id !== id))}/>)}</div>}
    {confirmation && <ConfirmDialog {...confirmation} onClose={() => setConfirmation(null)} onConfirm={() => { const action = confirmation.action; setConfirmation(null); action(); }}/>}
  </main>;
}

function DepartureCreate({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({ package: '', startDate: '', endDate: '', capacity: 10, price: '', currency: 'CAD' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const durationDays = form.startDate && form.endDate ? Math.max(0, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24))) : 0;
  const totalRevenue = Number(form.capacity) * Number(form.price) || 0;
  useEffect(() => { if (open) endpoints.adminPackages().then(({ data }) => setPackages(records(data))).catch((e) => setError(errorMessage(e))); }, [open]);
  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try { 
      await endpoints.createDeparture({ package: form.package, startDate: form.startDate, endDate: form.endDate, capacity: Number(form.capacity), pricePerPersonMinor: Math.round(Number(form.price) * 100), currency: form.currency }); 
      setOpen(false); 
      setForm({ package: '', startDate: '', endDate: '', capacity: 10, price: '', currency: 'CAD' });
      onCreated(); 
    }
    catch (e2) { setError(errorMessage(e2)); }
    finally { setSaving(false); }
  };
  return <><button className="button button-dark" disabled={saving} onClick={() => setOpen((x) => !x)}><Plus size={15}/> Add departure</button>{open && <form className="admin-edit-form departure-form-create" onSubmit={submit}>
    <div className="departure-form-header">
      <h3>Create New Departure</h3>
      <p>Add a new departure date, capacity, and pricing for a journey</p>
    </div>
    <div className="departure-form-grid">
      <div className="departure-form-field departure-form-field-full">
        <span className="field-label">Journey</span>
        <AnimatedSelect 
          required 
          value={form.package} 
          onChange={(e) => { 
            const selectedPackage = packages.find((p) => String(itemId(p)) === e.target.value); 
            setForm({ ...form, package: e.target.value, currency: selectedPackage?.currency || 'CAD', price: selectedPackage ? tripPrice(selectedPackage) : '' }); 
          }}
        >
          <option value="">Choose journey</option>
          {packages.filter((p) => p.status === 'active').map((p) => <option key={itemId(p)} value={itemId(p)}>{packageTitle(p)}</option>)}
        </AnimatedSelect>
      </div>
      <div className="departure-form-field">
        <span className="field-label">Start Date</span>
        <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}/>
      </div>
      <div className="departure-form-field">
        <span className="field-label">End Date</span>
        <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}/>
      </div>
      <div className="departure-form-field">
        <span className="field-label">Capacity</span>
        <input type="number" required min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}/>
      </div>
      <div className="departure-form-field">
        <span className="field-label">Price per Person ({form.currency})</span>
        <input type="number" required min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/>
      </div>
    </div>
    {form.package && form.startDate && form.endDate && form.price && <div className="departure-form-summary">
      <div className="summary-item">
        <span className="summary-label">Duration</span>
        <span className="summary-value">{durationDays} days</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Capacity</span>
        <span className="summary-value">{form.capacity} seats</span>
      </div>
      <div className="summary-item summary-item-highlight">
        <span className="summary-label">Total Revenue (est.)</span>
        <span className="summary-value">{money(totalRevenue, form.currency)}</span>
      </div>
    </div>}
    {error && <Alert>{error}</Alert>}
    <div className="departure-form-actions">
      <button className="button button-outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
      <button className="button button-dark" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Departure'}</button>
    </div>
  </form>}</>;
}

function DepartureActions({ row, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState((row.startDate || '').slice(0, 10));
  const [endDate, setEndDate] = useState((row.endDate || '').slice(0, 10));
  const [capacity, setCapacity] = useState(row.capacity);
  const [price, setPrice] = useState(row.pricePerPersonMinor / 100);
  const [saving, setSaving] = useState(false);
  const durationDays = date && endDate ? Math.max(0, Math.ceil((new Date(endDate) - new Date(date)) / (1000 * 60 * 60 * 24))) : 0;
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try { 
      await endpoints.updateDeparture(itemId(row), { startDate: date, endDate, capacity: Number(capacity), pricePerPersonMinor: Math.round(Number(price) * 100) }); 
      setEditing(false); 
      onChanged(); 
    }
    catch (e) { onError(errorMessage(e)); }
    finally { setSaving(false); }
  };
  if (!editing) {
    return <span className="table-actions"><button onClick={() => setEditing(true)}>Edit</button></span>;
  }
  return <div className="departure-edit-modal">
    <div className="departure-edit-header">
      <h3>Edit Departure Details</h3>
      <p>Update dates, capacity, and pricing for this departure</p>
    </div>
    <div className="departure-edit-content">
      <div className="departure-edit-grid">
        <div className="departure-edit-field">
          <span className="field-label">Start Date</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}/>
        </div>
        <div className="departure-edit-field">
          <span className="field-label">End Date</span>
          <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
        </div>
        <div className="departure-edit-field">
          <span className="field-label">Capacity</span>
          <input type="number" required min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)}/>
        </div>
        <div className="departure-edit-field">
          <span className="field-label">Price per Person ({row.currency})</span>
          <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}/>
        </div>
      </div>
      <div className="departure-edit-summary">
        <div className="summary-item">
          <span className="summary-label">Duration</span>
          <span className="summary-value">{durationDays} days</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Revenue (est.)</span>
          <span className="summary-value">{money(Number(capacity) * Number(price), row.currency)}</span>
        </div>
      </div>
    </div>
    <div className="departure-edit-actions">
      <button className="button button-outline" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
      <button className="button button-dark" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
    </div>
  </div>;
}

function NotFound() {
  return <main className="content-shell page-content"><EmptyState title="Looks like a wrong turn." copy="This page isn’t on our map." action={<Link to="/" className="button button-dark"><ArrowLeft size={15}/> Back home</Link>}/></main>;
}

function AdminLayout({ children, night, onToggleTheme }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return <div className="admin-shell"><header className="admin-shell-header">
    <Link to="/admin" className="admin-shell-brand" aria-label="Admin home"><img src={roamoraLogo} alt="Roamora"/><span>PRIVATE WORKSPACE</span></Link>
    <div className="admin-shell-actions"><ThemeSwitch night={night} onToggle={onToggleTheme}/><Link to="/" className="admin-site-link">View site</Link><button type="button" className="button button-outline" onClick={() => { signOut(); navigate('/login'); }}><LogOut size={15}/> Sign out</button></div>
  </header>{children}</div>;
}

export default function App() {
  const { pathname, hash } = useLocation();
  const { user, loginRevision } = useAuth();
  const [night, setNight] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancellationRevision, setCancellationRevision] = useState(0);
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    return () => { delete document.documentElement.dataset.theme; };
  }, [night]);
  useLayoutEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
      ScrollTrigger.refresh();
    }
  }, [pathname, hash]);
  const routes = <Routes>
    <Route path="/" element={<Landing/>}/><Route path="/explore" element={<Explore/>}/><Route path="/trips/:id" element={<TripDetail/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/compare" element={<Compare/>}/><Route path="/travo" element={<Travo/>}/><Route path="/book/:id" element={<Protected><Booking/></Protected>}/><Route path="/booking/confirmation/:id" element={<Protected><Confirmation/></Protected>}/><Route path="/review/:id" element={<Protected><ReviewPage/></Protected>}/>
    <Route path="/dashboard" element={<Protected><Dashboard onRequestCancel={setCancelBooking} cancellationRevision={cancellationRevision}/></Protected>}/>
    <Route path="/admin" element={<Protected admin><AdminLayout night={night} onToggleTheme={() => setNight((value) => !value)}><Admin/></AdminLayout></Protected>}/>
    <Route path="/admin/orders/:id" element={<Protected admin><AdminLayout night={night} onToggleTheme={() => setNight((value) => !value)}><Confirmation admin/></AdminLayout></Protected>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
  return <>{pathname === '/admin' || pathname.startsWith('/admin/') ? routes : <ClickSpark className="app-shell" targetSelector="[data-click-spark], .site-header a, .site-header button" sparkColor={night ? ['#83b5aa', '#d6e8e1', '#ffffff'] : ['#47766c', '#d2a36f', '#ffffff']} sparkSize={12} sparkRadius={28} duration={500} glow={0.35} ring><SpecularControls/><Header night={night} onToggleTheme={() => setNight((value) => !value)}/>{pathname === '/' ? routes : <FadeContent key={pathname} className="route-content" effect="focus" duration={0.6} trigger="mount">{routes}</FadeContent>}<Footer/>{cancelBooking && <CancelBookingModal booking={cancelBooking} onClose={() => setCancelBooking(null)} onRefresh={() => setCancellationRevision((value) => value + 1)}/>}{pathname !== '/travo' && <TravoBubble/>}</ClickSpark>}<ReviewReminder user={user} loginRevision={loginRevision} pathname={pathname}/></>;
}
