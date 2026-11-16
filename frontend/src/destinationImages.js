const destinationImages = [
  [/\blisbon\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551606/lisbon_lwyktx.avif'],
  [/\bkyoto\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551604/kyoto_buw3fp.jpg'],
  [/\bswiss alps\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551556/swiss_alps_yq02hz.jpg'],
  [/\bmarrakech\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551557/Marrakech_of59dz.png'],
  [/\bbanff\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551556/banff_l3zbyh.jpg'],
  [/\bbali\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551556/bali_na80rt.jpg'],
  [/\bkrabi\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551556/krabi_rzfj40.webp'],
  [/\breykjav[ií]k\b/i, 'https://res.cloudinary.com/divypkla0/image/upload/v1794551556/reykjsvik_f0u2qk.jpg'],
];

const defaultImage = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85';

function imageUrl(image) {
  if (typeof image === 'string') return image.trim();
  if (image && typeof image === 'object') {
    return [image.url, image.secure_url, image.src].find((value) => typeof value === 'string' && value.trim())?.trim();
  }
  return '';
}

export function packageImage(item) {
  const explicitImage = [item?.imageUrl, item?.image, item?.coverImage, ...(Array.isArray(item?.images) ? item.images : [])]
    .map(imageUrl).find(Boolean);
  if (explicitImage) return explicitImage;
  const destination = item?.destination || item?.location || '';
  return destinationImages.find(([pattern]) => pattern.test(destination))?.[1] || defaultImage;
}
