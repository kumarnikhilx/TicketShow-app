// Control/Bookingscontrol.js
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { inngest } from "../Inngest/index.js";
import { clerkClient } from "@clerk/express"; // ✨ NEW: to fetch user email at booking time

// Check seat availability
export const checkavailabilty = async (showId, selectedSeats) => {
  try {
    const show = await Show.findById(showId);
    if (!show) return false;

    const occupiedSeats = show.occupiedSeats || {};
    const isSeatTaken = selectedSeats.some((s) => occupiedSeats[s]);

    return !isSeatTaken;
  } catch (error) {
    console.log("Error in checkavailabilty:", error);
    return false;
  }
};

// Create booking + Razorpay order
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth(); // Clerk User id
    const { showId, selectedSeats } = req.body;

    const isAvailable = await checkavailabilty(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({ success: false, message: "Seats not available" });
    }

    const show = await Show.findById(showId).populate("movie");
    if (!show) {
      return res.json({ success: false, message: "Show not found" });
    }

    // ✨ NEW: Fetch Clerk user email and store as fallback in Booking
    let userEmail = undefined;
    try {
      const user = await clerkClient.users.getUser(userId);
      userEmail = user?.emailAddresses?.[0]?.emailAddress;
      console.log("📧 createBooking - user email resolved:", userEmail);
    } catch (e) {
      console.warn("⚠️ Could not fetch user email from Clerk:", e);
    }

    // Create booking in database
    const booking = await Booking.create({
      user: userId, // This must match User _id from Clerk (string)
      show: showId,
      amount: show.showprice * selectedSeats.length,
      bookedseats: selectedSeats,
      email: userEmail, // ✨ NEW: store email fallback
    });

    // Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: booking.amount * 100,
      currency: "INR",
      receipt: booking._id.toString(),
    });

    return res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: booking.amount,
      bookingId: booking._id,
      showId,
      selectedSeats,
    });
  } catch (error) {
    console.log("Error in createBooking:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Verify Razorpay Signature
// Verify Razorpay Signature
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      showId,
      selectedSeats,
    } = req.body;

    console.log("🔔 verifyPayment called with bookingId:", bookingId);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.log("❌ Signature mismatch for booking:", bookingId);
      return res.json({ success: false, message: "Payment verification failed" });
    }

    console.log("✅ Payment verified for booking:", bookingId);

    // Mark booking paid
    await Booking.findByIdAndUpdate(bookingId, { isPaid: true });

    // Mark seats booked
    const show = await Show.findById(showId);
    if (!show) {
      console.log("❌ Show not found for showId:", showId);
      return res.json({ success: false, message: "Show not found" });
    }

    selectedSeats.forEach((s) => {
      if (!show.occupiedSeats) show.occupiedSeats = {};
      show.occupiedSeats[s] = true;
    });

    show.markModified("occupiedSeats");
    await show.save();

    // ✨ NEW: yahi pe booking + movie + email data resolve karo
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "Movie",
        },
      })
      .populate("user");

    if (!booking) {
      console.log("❌ Booking not found when preparing email payload:", bookingId);
      return res.json({ success: true }); // payment done, email skip
    }

    const email =
      booking.email ||                      // stored in createBooking
      booking.user?.email ||                // populated user
      null;

    const name = booking.user?.name || "Movie Lover";
    const movieTitle = booking.show?.movie?.originalTitle || "your movie";
    const primaryImage = booking.show?.movie?.primaryImage || "";
    const showDateTime = booking.show?.showDateTime || null;
    const seats = booking.bookedseats || [];

    console.log("📦 Email payload:", {
      bookingId,
      email,
      name,
      movieTitle,
      hasShowDateTime: !!showDateTime,
      seats,
    });

    console.log("✅ Seats updated, sending Inngest event for booking:", bookingId);

    // ✨ CHANGE: Event me full data bhej rahe hain
    try {
      await inngest.send({
        name: "app/show.booked",
        data: {
          bookingId,
          email,
          name,
          movieTitle,
          primaryImage,
          showDateTime,
          seats,
        },
      });
      console.log("📤 Inngest event 'app/show.booked' sent for booking:", bookingId);
    } catch (e) {
      console.error("❌ Failed to send Inngest event for booking:", bookingId, e);
    }

    return res.json({ success: true });
  } catch (error) {
    console.log("Error in verifyPayment:", error);
    return res.json({ success: false, message: error.message });
  }
};


// Get occupied seats
export const getoccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const show = await Show.findById(showId);

    if (!show) {
      return res.json({ success: false, message: "Show not found" });
    }

    return res.json({
      success: true,
      occupiedSeats: Object.keys(show.occupiedSeats || {}),
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
