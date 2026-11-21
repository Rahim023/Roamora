import { Link } from 'react-router-dom';
import { packageImage } from '../destinationImages.js';

const destinationImage = (destination) => packageImage({ image: destination.image, destination: destination.name });
const destinationLink = (destination) => destination.package
  ? `/trips/${destination.package}`
  : `/explore?destination=${encodeURIComponent(destination.name)}`;

export function HomepageDestinationCards({ destinations }) {
  if (!destinations.length) return null;
  return <section className="homepage-destinations content-shell">
    <div className="eyebrow">PLACES TO DISCOVER</div>
    <h2>Find your next destination.</h2>
    <div className="homepage-destination-grid">{destinations.map((destination, index) => <Link key={`${destination.name}-${index}`} to={destinationLink(destination)} className="homepage-destination-card">
      <img src={destinationImage(destination)} alt="" loading="lazy"/>
      <span><small>{destination.country || 'Explore'}</small><strong>{destination.name}</strong></span>
    </Link>)}</div>
  </section>;
}

