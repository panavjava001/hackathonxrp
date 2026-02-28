import { Booking, BookingStatus } from './types';
import { v4 as uuidv4 } from 'uuid'; // You'll need to run: npm install uuid

export class BookingService {
  // Temporary storage (clipboard) for all bookings during the hackathon
  private bookings: Map<string, Booking> = new Map();

  // TASK: Start a new booking hold
  async createHold(eventId: string): Promise<Booking> {
    const bookingId = uuidv4();
    const expiry = Date.now() + (10 * 60 * 1000); // Set 10-minute timer

    const newBooking: Booking = {
      id: bookingId,
      eventId: eventId,
      status: BookingStatus.HELD,
      holdExpiresAt: expiry
    };

    this.bookings.set(bookingId, newBooking);
    console.log(`[The Brain] Created hold ${bookingId} for event ${eventId}.`);
    return newBooking;
  }

  // TASK: Confirm booking when RLUSD arrives (Called by Person C)
  async confirmPayment(bookingId: string): Promise<boolean> {
    const booking = this.bookings.get(bookingId);
    if (!booking) return false;

    // The Anti-Ghosting Guard: Is the user on time?
    if (Date.now() < booking.holdExpiresAt) {
      booking.status = BookingStatus.CONFIRMED;
      console.log(`[The Brain] Booking ${bookingId} is now CONFIRMED!`);
      return true;
    } else {
      booking.status = BookingStatus.EXPIRED;
      console.log(`[The Brain] Booking ${bookingId} EXPIRED. Release the seat.`);
      return false;
    }
  }
}
