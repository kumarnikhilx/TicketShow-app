// controllers/bookingController.js
import crypto from "crypto";
import Razorpay from "razorpay";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/sendEmail.js"; // 👈 NEW

// Check seat availability
export const checkavailabilty = async (showId, selectedSeats) => {
  try {
    const show = await Show.findById(showId);
    if (!show) return false;

    const occupiedSeats = show.occupiedSeats || {};
    const isSeatTaken = selectedSeats.some((s) => occupiedSeats[s]);

    return !isSeatTaken;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Create booking + Razorpay order
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth(); // Clerk User
    const { showId, selectedSeats, email } = req.body; // 👈 email from frontend

    const isAvailable = await checkavailabilty(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({ success: false, message: "Seats not available" });
    }

    const show = await Show.findById(showId).populate("movie");

    if (!show) {
      return res.json({ success: false, message: "Show not found" });
    }

    // Create booking in database (store email also)
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: show.showprice * selectedSeats.length,
      bookedseats: selectedSeats,
      email, // 👈 IMPORTANT
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

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: booking.amount,
      bookingId: booking._id,
      showId,
      selectedSeats,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Razorpay Signature + send email
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

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.json({ success: false, message: "Payment verification failed" });
    }

    // 1) Mark booking paid & get booking (with email)
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { isPaid: true },
      { new: true }
    );

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // 2) Get show + movie
    const show = await Show.findById(showId).populate("movie");

    if (!show) {
      return res.json({ success: false, message: "Show not found" });
    }

    // 3) Mark seats booked
    selectedSeats.forEach((s) => {
      if (!show.occupiedSeats) show.occupiedSeats = {};
      show.occupiedSeats[s] = true;
    });
    show.markModified("occupiedSeats");
    await show.save();

    // 4) Movie title & show time (from your structures)
    const movieTitle = show.movie?.originalTitle || "Your Movie";

    // showDateTime is stored as Date in DB
    const showTimeIST = new Date(show.showDateTime).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });

    const userEmail = booking.email;

    if (userEmail) {
      const emailBody = `
        <h2>Your Ticket is Confirmed 🎟️</h2>
        <p><b>Movie:</b> ${movieTitle}</p>
        <p><b>Show Time:</b> ${showTimeIST}</p>
        <p><b>Seats:</b> ${selectedSeats.join(", ")}</p>
        <p><b>Amount Paid:</b> ₹${booking.amount}</p>
        <p><b>Booking ID:</b> ${booking._id}</p>
        <p>Enjoy your movie! 🍿</p>
      `;

      await sendEmail({
        to: userEmail,
        subject: `Ticket Confirmed - ${movieTitle}`,
        body: emailBody,
      });
    } else {
      console.log("⚠️ No email found on booking, so email not sent.");
    }

    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
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

    res.json({
      success: true,
      occupiedSeats: Object.keys(show.occupiedSeats || {}),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
