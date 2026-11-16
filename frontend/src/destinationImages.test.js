import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packageImage } from './destinationImages.js';

test('matches each destination to its supplied image', () => {
  const destinations = {
    Lisbon: 'lisbon_lwyktx.avif',
    Kyoto: 'kyoto_buw3fp.jpg',
    'Swiss Alps': 'swiss_alps_yq02hz.jpg',
    Marrakech: 'Marrakech_of59dz.png',
    Banff: 'banff_l3zbyh.jpg',
    Bali: 'bali_na80rt.jpg',
    Krabi: 'krabi_rzfj40.webp',
    Reykjavik: 'reykjsvik_f0u2qk.jpg',
    Reykjavík: 'reykjsvik_f0u2qk.jpg',
  };
  for (const [destination, filename] of Object.entries(destinations)) {
    assert.ok(packageImage({ destination }).endsWith(filename), destination);
  }
});

test('prefers usable package images and handles missing or unrecognised values', () => {
  assert.equal(packageImage({ destination: 'Bali', images: [null, { url: 'https://example.com/image.jpg' }] }), 'https://example.com/image.jpg');
  assert.equal(packageImage({ destination: 'Bali', imageUrl: 'https://example.com/cover.jpg', images: ['https://example.com/other.jpg'] }), 'https://example.com/cover.jpg');
  assert.match(packageImage({ destination: 'Tokyo', country: 'Japan' }), /images\.unsplash\.com/);
  assert.match(packageImage(), /images\.unsplash\.com/);
});
