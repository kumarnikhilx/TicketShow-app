// Inngest/index.js
import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/sendEmail.js";
import Movie from "../models/Movie.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

/* ---------------------------------------------------------
   ⭐ Helper function: Always return clean full name
----------------------------------------------------------- */
function buildUserName(firstName, lastName) {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName && !lastName) return firstName;
  return firstName || lastName || "User";
}

/* ---------------------------------------------------------
   CLERK USER SYNC
----------------------------------------------------------- */

const userCreated = inngest.createFunction(
  { id: "create-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    await User.create({
      _id: id,
      firstName: first_name || "",
      lastName: last_name || "",
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      email: email_addresses?.[0]?.email_address,
      image: image_url,
    });
  }
);

const userUpdated = inngest.createFunction(
  { id: "update-user" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    await User.findByIdAndUpdate(
      id,
      {
        firstName: first_name || "",
        lastName: last_name || "",
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        email: email_addresses?.[0]?.email_address,
        image: image_url,
      },
      { upsert: true }
    );
  }
);

const userDeleted = inngest.createFunction(
  { id: "delete-user" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await User.findByIdAndDelete(event.data.id);
  }
);

/* ---------------------------------------------------------
   RELEASE SEATS FOR UNPAID BOOKING
----------------------------------------------------------- */

const releaseSeatsandDeletebooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    await step.sleep("10-min-wait", "10m");

    const booking = await Booking.findById(event.data.bookingId);
    if (!booking || booking.isPaid) return;

    const show = await Show.findById(booking.show);
    booking.bookedseats.forEach((seat) => delete show.occupiedSeats[seat]);

    show.markModified("occupiedSeats");
    await show.save();
    await Booking.findByIdAndDelete(booking._id);
  }
);

/* ---------------------------------------------------------
   CLEANUP OLD DATA
----------------------------------------------------------- */

const cleanupOldData = inngest.createFunction(
  { id: "cleanup-old-bookings-shows" },
  { cron: "0 0 1 1,7 *" },
  async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await Booking.deleteMany({ createdAt: { $lt: sixMonthsAgo } });
    await Show.deleteMany({ showDateTime: { $lt: sixMonthsAgo } });
  }
);

/* ---------------------------------------------------------
   SEND BOOKING EMAIL — firstname + lastname only
----------------------------------------------------------- */

const sendBookingEmail = inngest.createFunction(
  { id: "send-booking-confirmation-mail" },
  { event: "app/show.booked" },
  async ({ event }) => {
    console.log("📩 Booking event received:", event.data);

    const {
      bookingId,
      email,
      firstName,
      lastName,
      movieTitle,
      primaryImage,
      showDateTime,
      seats,
    } = event.data;

    // ⭐ Always clean firstname + lastname
    const userName = buildUserName(firstName, lastName);

    // Convert time
    let showDate = "N/A",
      showTime = "N/A";

    if (showDateTime) {
      const dt = new Date(showDateTime);
      showDate = dt.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
      showTime = dt.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" });
    }

    await sendEmail({
      to: email,
      subject: `Payment confirmed: '${movieTitle}' booked!`,
      body: `
        <h2>Hello ${userName},</h2>
        <p>Your booking for <b>${movieTitle}</b> is confirmed!</p>
        <p><b>Date:</b> ${showDate}</p>
        <p><b>Time:</b> ${showTime}</p>
        <p><b>Seats:</b> ${seats.join(", ")}</p>
      `,
    });

    console.log("✅ Booking email sent:", bookingId);
  }
);

/* ---------------------------------------------------------
   SEND NEW MOVIE EMAIL — firstname + lastname only
----------------------------------------------------------- */

const sendNewMovieEmail = inngest.createFunction(
  { id: "send-new-movie-notification" },
  { event: "app/show.added" },
  async ({ event }) => {
    const movie = await Movie.findById(event.data.movieId);
    const users = await User.find({});

    for (const user of users) {
      const fullName = buildUserName(user.firstName, user.lastName);

      await sendEmail({
        to: user.email,
        subject: `New Movie Added: ${movie.originalTitle}`,
        body: `
          <h2>Hello ${fullName},</h2>
          <p>A new movie <b>${movie.originalTitle}</b> is now available on TicketShow!</p>
        `,
      });
    }
  }
);

/* ---------------------------------------------------------
   EXPORT ALL FUNCTIONS
----------------------------------------------------------- */

export const functions = [
  userCreated,
  userUpdated,
  userDeleted,
  releaseSeatsandDeletebooking,
  cleanupOldData,
  sendBookingEmail,
  sendNewMovieEmail,
];
