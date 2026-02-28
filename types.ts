// Importing unique ID generator to create booking IDs
import { v4 as uuidv4 } from 'uuid'; 

// Define the different states a booking can be in [cite: 171, 181]
export enum BookingStatus {
  HELD = 'HELD', // Seat is temporarily reserved while waiting for payment
  CONFIRMED = 'CONFIRMED', // Deposit received on XRPL, booking is official [cite: 181, 187]
  CANCELLED_REFUNDED = 'CANCELLED_REFUNDED', // User cancelled and got their money back
  EXPIRED = 'EXPIRED' // User failed to pay within the 10-minute window
}

// The data structure for a single Booking object
export interface Booking {
  id: string; // Unique identifier for this specific booking
  eventId: string; // The ID of the restaurant/webinar event
  userId: string; // Who is making the booking
  status: BookingStatus; // Current state in the lifecycle
  holdExpiresAt: number; // The Unix timestamp when the hold expires
}

export class BookingService {
  // Simple in-memory storage for the hackathon (replaces a real database)
  private bookings: Map<string, Booking> = new Map();

  // STEP 1: Create the initial hold when a user clicks "Book"
  async createHold(eventId: string, userId: string): Promise<Booking> {
    // Generate a new unique ID for this session
    const bookingId = uuidv4(); 
    
    // Set expiry to exactly 10 minutes from now (Current Time + 600,000ms)
    const expiry = Date.now() + (10 * 60 * 1000); 

    const newBooking: Booking = {
      id: bookingId,
      eventId,
      userId,
      status: BookingStatus.HELD, // Start in the HELD state
      holdExpiresAt: expiry,
    };

    // Save the booking to our "database"
    this.bookings.set(bookingId, newBooking); 
    
    // Log for debugging (helps you see what's happening in the terminal)
    console.log(`[The Brain] Created hold for ${bookingId}. Expires at ${new Date(expiry).toLocaleTimeString()}`);
    
    return newBooking;
  }

  // STEP 2: Confirm the booking (Called by Person C when RLUSD is detected) [cite: 181, 187]
  async confirmBooking(bookingId: string): Promise<boolean> {
    const booking = this.bookings.get(bookingId);

    // Error check: Does this booking even exist?
    if (!booking) throw new Error("Booking not found");

    // CRITICAL LOGIC: Is the user too late? (Anti-Ghosting Guard)
    if (Date.now() > booking.holdExpiresAt) {
      booking.status = BookingStatus.EXPIRED; // Mark as expired
      console.log(`[The Brain] Payment too late for ${bookingId}. Seat released.`);
      return false; // Return false so Person C knows to trigger a refund
    }

    // Success: Update status to CONFIRMED [cite: 181]
    booking.status = BookingStatus.CONFIRMED; 
    console.log(`[The Brain] Booking ${bookingId} is now CONFIRMED. Money is in Smart Escrow.`);
    return true;
  }

  // STEP 3: Handle Cancellation (Talks to Person D to release the Escrow) [cite: 181]
  async requestCancellation(bookingId: string): Promise<string> {
    const booking = this.bookings.get(bookingId);
    
    if (!booking || booking.status !== BookingStatus.CONFIRMED) {
      throw new Error("Only confirmed bookings can be cancelled for a refund.");
    }

    // Change status to prevent double-refunds
    booking.status = BookingStatus.CANCELLED_REFUNDED;
    
    // You would tell Person D here: "Release the Smart Escrow for this ID" 
    return `Cancellation processed for ${bookingId}. Person D is now triggering the XRPL refund.`;
  }
}
