export function adminBookingReference(order) {
  const reference = order?.bookingReference;
  const id = order?._id || order?.id;
  if (order?.isDemo && /demo/i.test(reference || '')) {
    return id ? `Booking ID ${id}` : 'Booking reference unavailable';
  }
  return reference || (id ? `Booking ID ${id}` : 'Booking reference unavailable');
}

export function adminPersonName(record, name) {
  return record?.isDemo && /demo/i.test(name || '') ? 'Traveller' : name;
}
