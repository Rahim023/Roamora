import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Activity, Departure, Itinerary, Order, Package, Review, SiteContent, User, Wishlist } from './index.js';

describe('Roamora Mongoose models', () => {
  it('binds every model to the requested MongoDB collection', () => {
    expect({
      users: User.collection.name,
      packages: Package.collection.name,
      departures: Departure.collection.name,
      orders: Order.collection.name,
      wishlists: Wishlist.collection.name,
      reviews: Review.collection.name,
      activities: Activity.collection.name,
      itineraries: Itinerary.collection.name,
      sitecontents: SiteContent.collection.name,
    }).toEqual({
      users: 'users',
      packages: 'package',
      departures: 'departures',
      orders: 'orders',
      wishlists: 'wishlist',
      reviews: 'reviews',
      activities: 'activities',
      itineraries: 'iteneraries',
      sitecontents: 'sitecontents',
    });
  });

  it('normalizes user email and applies the traveller role default', async () => {
    const user = new User({ name: 'Demo Traveller', email: 'TRAVELLER@EXAMPLE.COM' });
    await user.validate();
    expect(user.email).toBe('traveller@example.com');
    expect(user.role).toBe('user');
  });

  it('rejects package stops outside latitude and longitude ranges', async () => {
    const trip = new Package({
      title: 'Sample Trip',
      slug: 'sample-trip',
      destination: 'Bali',
      country: 'Indonesia',
      travelType: 'Beach',
      description: 'A sample itinerary.',
      durationDays: 3,
      nights: 2,
      pricePerPersonMinor: 150000,
      cancellationPolicy: { freeCancellationDaysBefore: 14, refundPercent: 100 },
      stops: [{ name: 'Invalid stop', latitude: 91, longitude: 181 }],
    });

    await expect(trip.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'stops.0.latitude': expect.any(Error),
        'stops.0.longitude': expect.any(Error),
      }),
    });
  });

  it('enforces departure seat-count invariants', async () => {
    const departure = new Departure({
      package: new mongoose.Types.ObjectId(),
      startDate: new Date('2027-02-01T00:00:00Z'),
      endDate: new Date('2027-02-04T00:00:00Z'),
      capacity: 10,
      bookedSeats: 3,
      availableSeats: 6,
      pricePerPersonMinor: 10000,
      currency: 'CAD',
      status: 'scheduled',
    });

    await expect(departure.validate()).rejects.toHaveProperty('errors.availableSeats');
  });

  it('enforces booking totals and traveller count consistency', async () => {
    const user = new mongoose.Types.ObjectId();
    const packageId = new mongoose.Types.ObjectId();
    const departureId = new mongoose.Types.ObjectId();
    const order = new Order({
      user,
      package: packageId,
      departure: departureId,
      bookingReference: 'ROA-TEST-0001',
      status: 'confirmed',
      paymentStatus: 'paid',
      travellerCount: 2,
      travellers: [{ name: 'Traveller One' }],
      contact: { name: 'Traveller One', email: 'one@example.com' },
      unitPriceMinor: 10000,
      subtotalMinor: 10000,
      feesMinor: 0,
      totalMinor: 12000,
      amountPaidMinor: 12000,
      refundedMinor: 0,
      packageSnapshot: { title: 'Sample Trip', destination: 'Bali' },
      startDate: new Date('2027-02-01T00:00:00Z'),
      endDate: new Date('2027-02-04T00:00:00Z'),
      emailStatus: 'not_sent_demo',
    });

    await expect(order.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        travellerCount: expect.any(Error),
        totalMinor: expect.any(Error),
      }),
    });
  });
});
