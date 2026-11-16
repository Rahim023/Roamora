import { useState } from 'react';
import { ArrowRight, Compass, MapPin, Sparkles } from 'lucide-react';
import { packageImage } from '../destinationImages.js';

const guides = [
  { destination: 'Bali', country: 'Indonesia', theme: 'Island rhythms', intro: 'Make room for beach mornings, green landscapes and the island’s creative spirit.', ideas: ['Explore a local market', 'Visit a temple respectfully', 'Leave time for a slower beach day'], tip: 'For temple visits, check local dress requirements and bring a covering for your shoulders and knees.' },
  { destination: 'Kyoto', country: 'Japan', theme: 'Tradition & quiet corners', intro: 'Discover a city of historic streets, gardens and places made for taking your time.', ideas: ['Wander a historic neighborhood', 'Spend time in a garden', 'Try a local tea or food experience'], tip: 'Keep pathways clear in residential areas and follow photography signs at temples and shrines.' },
  { destination: 'Swiss Alps', country: 'Switzerland', theme: 'Mountain air', intro: 'Trade the everyday for alpine scenery, mountain villages and memorable walks.', ideas: ['Take a scenic rail journey', 'Explore an alpine village', 'Find a trail suited to your experience'], tip: 'Mountain weather can change quickly. Check the forecast and trail conditions before setting out.' },
  { destination: 'Banff', country: 'Canada', theme: 'Wild landscapes', intro: 'Find mountain views, forest trails and lakes worth slowing down for.', ideas: ['Walk beside an alpine lake', 'Look for a scenic viewpoint', 'Explore the town of Banff'], tip: 'Give wildlife plenty of space and check park guidance before heading onto trails.' },
  { destination: 'Krabi', country: 'Thailand', theme: 'Coast & limestone', intro: 'Think dramatic cliffs, coastal scenery and unhurried days by the water.', ideas: ['Watch the coast at sunset', 'Explore a local food market', 'Plan a day on the water'], tip: 'Check local weather and sea conditions before booking or setting out on a boat trip.' },
  { destination: 'Lisbon', country: 'Portugal', theme: 'City of viewpoints', intro: 'Explore a city of tiled streets, hilltop views and lively neighborhoods.', ideas: ['Walk to a viewpoint', 'Explore a neighborhood on foot', 'Pause for a local pastry'], tip: 'Comfortable shoes help on Lisbon’s hills and uneven, sometimes slippery, pavements.' },
  { destination: 'Marrakech', country: 'Morocco', theme: 'Color & craft', intro: 'Step into a city of gardens, courtyards and bustling streets full of craft.', ideas: ['Explore a garden', 'Browse a local souk', 'Discover traditional Moroccan food'], tip: 'Ask before photographing people and agree on prices before committing to a purchase or service.' },
  { destination: 'Reykjavik', country: 'Iceland', theme: 'Northern inspiration', intro: 'Use the colorful capital as a starting point for culture and Iceland’s striking landscapes.', ideas: ['Explore the waterfront', 'Visit a local museum', 'Plan a scenic day outside the city'], tip: 'Bring layers and check weather and road conditions, particularly before traveling outside the city.' },
];

export default function DestinationGuides({ onExplore }) {
  const [selected, setSelected] = useState(0);
  const guide = guides[selected];
  return <section className="destination-guides" aria-labelledby="destination-guides-heading">
    <div className="destination-guides-heading">
      <div><span className="eyebrow">A LITTLE INSPIRATION</span><h2 id="destination-guides-heading">Get to know somewhere new.</h2></div>
      <p>Start with a place, find your pace, and gather a few ideas for the journey.</p>
    </div>
    <div className="destination-guide-picker" aria-label="Choose a destination">
      {guides.map((item, index) => <button key={item.destination} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>{item.destination}</button>)}
    </div>
    <div className="destination-guide-card">
      <div className="destination-guide-image">
        <img src={packageImage({ destination: guide.destination })} alt={`View of ${guide.destination}`} loading="lazy"/>
        <div className="destination-guide-image-label"><MapPin size={14}/>{guide.country}<strong>{guide.destination}</strong></div>
      </div>
      <div className="destination-guide-content">
        <div className="destination-guide-kicker"><Compass size={15}/> THE ROAMORA FIELD NOTES</div>
        <h3>{guide.theme}</h3>
        <p className="destination-guide-intro">{guide.intro}</p>
        <div className="destination-guide-ideas"><span>MAKE TIME FOR</span><ul>{guide.ideas.map((idea) => <li key={idea}><Sparkles size={14}/>{idea}</li>)}</ul></div>
        <div className="destination-guide-tip"><strong>A little travel note</strong><p>{guide.tip}</p></div>
        <button type="button" className="button button-dark destination-guide-action" onClick={() => onExplore(guide.destination)}>Explore {guide.destination} journeys <ArrowRight size={16}/></button>
      </div>
    </div>
  </section>;
}
