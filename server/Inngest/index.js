// Inngest/index.js
import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/sendEmail.js";
import Movie from "../models/Movie.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

/* ----------------- HELPER: SAFE NAME BUILDER ----------------- */

const buildSafeName = ({ firstName, lastName, username, email, fallback }) => {
  let fullName = `${firstName || ""} ${lastName || ""}`.trim();

  if (
    !fullName ||
    fullName.toLowerCase() === "null null" ||
    fullName.toLowerCase() === "null"
  ) {
    fullName =
      username ||
      (email ? email.split("@")[0] : "") ||
      fallback ||
      "Movie Lover";
  }

  return fullName;
};

/* ----------------- CLERK USER SYNC FUNCTIONS ----------------- */

const userCreated = inngest.createFunction(
  { id: "create-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
      username,
    } = event.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    const fullName = buildSafeName({
      firstName: first_name,
      lastName: last_name,
      username,
      email: primaryEmail,
    });

    const userdata = {
      _id: id,
      name: fullName,
      email: primaryEmail,
      image: image_url,
    };

    if (!userdata.email) {
      console.warn("User created without email, clerk event:", event.data);
      return;
    }

    await User.create(userdata);
  }
);

const userUpdated = inngest.createFunction(
  { id: "update-user" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
      username,
    } = event.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    const fullName = buildSafeName({
      firstName: first_name,
      lastName: last_name,
      username,
      email: primaryEmail,
    });

    const userdata = {
      _id: id,
      name: fullName,
      email: primaryEmail,
      image: image_url,
    };

    await User.findByIdAndUpdate(id, userdata, { upsert: true });
  }
);

const userDeleted = inngest.createFunction(
  { id: "delete-user" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

/* --------- AUTO RELEASE SEATS + DELETE UNPAID BOOKING -------- */

const releaseSeatsandDeletebooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);

    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const { bookingId } = event.data;
      const booking = await Booking.findById(bookingId);

      if (!booking) return;

      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        if (show && booking.bookedseats?.length) {
          booking.bookedseats.forEach((seat) => {
            delete show.occupiedSeats?.[seat];
          });
          show.markModified("occupiedSeats");
          await show.save();
        }
        await Booking.findByIdAndDelete(booking._id);
        console.log(`Released seats and deleted unpaid booking ${bookingId}`);
      }
    });
  }
);

/* ----------------- CLEANUP OLD DATA (CRON) ------------------- */

export const cleanupOldData = inngest.createFunction(
  { id: "cleanup-old-bookings-shows" },
  { cron: "0 0 1 1,7 *" }, // 00:00 on Jan 1 & Jul 1
  async ({ step }) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return step.run("delete-old-bookings-and-shows", async () => {
      const deletedBookings = await Booking.deleteMany({
        createdAt: { $lt: sixMonthsAgo },
      });

      const deletedShows = await Show.deleteMany({
        showDateTime: { $lt: sixMonthsAgo },
      });

      console.log(
        `Deleted ${deletedBookings.deletedCount} old bookings and ${deletedShows.deletedCount} shows.`
      );

      return {
        deletedBookings: deletedBookings.deletedCount,
        deletedShows: deletedShows.deletedCount,
      };
    });
  }
);

/* ----------------- BOOKING CONFIRMATION EMAIL ----------------
   Uses event.data first; falls back to DB (Booking+Show+Movie)
---------------------------------------------------------------- */

const sendBookingEmail = inngest.createFunction(
  { id: "send-booking-confirmation-mail" },
  { event: "app/show.booked" },
  async ({ event }) => {
    console.log("📩 [Inngest] app/show.booked received with data:", event.data);

    try {
      let {
        bookingId,
        email,
        name,
        movieTitle,
        primaryImage,
        showDateTime,
        seats,
      } = event.data || {};

      // ✨ FALLBACK: If anything important missing, pull from DB
      let bookingFromDb = null;
      if (!email || !movieTitle || !showDateTime || !Array.isArray(seats)) {
        if (bookingId) {
          bookingFromDb = await Booking.findById(bookingId)
            .populate({
              path: "show",
              populate: { path: "movie", model: "Movie" },
            })
            .populate({ path: "user", select: "name email image" });

          console.log("📌 Booking fetched from DB (fallback):", {
            exists: !!bookingFromDb,
            hasUser: !!bookingFromDb?.user,
            hasShow: !!bookingFromDb?.show,
            hasMovie: !!bookingFromDb?.show?.movie,
          });

          if (bookingFromDb) {
            email =
              email ||
              bookingFromDb.email ||
              bookingFromDb.user?.email ||
              null;
            if (!Array.isArray(seats) || !seats.length) {
              seats = bookingFromDb.bookedseats || [];
            }
            if (!showDateTime && bookingFromDb.show?.showDateTime) {
              showDateTime = bookingFromDb.show.showDateTime;
            }
            if (bookingFromDb.show?.movie) {
              movieTitle =
                movieTitle || bookingFromDb.show.movie.originalTitle || null;
              primaryImage =
                primaryImage || bookingFromDb.show.movie.primaryImage || null;
            }
            // name fallback from DB user
            if (!name && bookingFromDb.user) {
              name = bookingFromDb.user.name;
            }
          }
        }
      }

      if (!email) {
        console.warn(
          `❌ No email resolved for booking ${bookingId} (event + DB fallback), skipping email`
        );
        return;
      }

      // ✨ Smart userName: avoids "NULL NULL", falls back to email username
      let userName = buildSafeName({
        firstName: null,
        lastName: null,
        username: null,
        email,
        fallback: name || bookingFromDb?.user?.name,
      });

      const title = movieTitle || "your movie";

      let showTime = "N/A";
      let showDate = "N/A";

      if (showDateTime) {
        const dt = new Date(showDateTime);
        showTime = dt.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        showDate = dt.toLocaleDateString("en-US", {
          timeZone: "Asia/Kolkata",
        });
      }

      console.log(
        "✉️ Resolved email payload:",
        JSON.stringify(
          {
            bookingId,
            email,
            userName,
            title,
            showDate,
            showTime,
            seats,
          },
          null,
          2
        )
      );

      await sendEmail({
        to: email,
        subject: `Payment confirmation: '${title}' booked!`,
        body: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background-color: #7b2cbf; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎟️ TicketShow Booking Confirmed!</h1>
          </div>

          <div style="padding: 24px; font-size: 16px; color: #333;">
            <h2 style="margin-top: 0;">Hi ${userName},</h2>
            <p>Your booking for <strong style="color: #7b2cbf;">"${title}"</strong> is confirmed.</p>

            <p>
              <strong>Date:</strong> ${showDate}<br>
              <strong>Time:</strong> ${showTime}
            </p>
            <p><strong>Booking ID:</strong> <span style="color: #7b2cbf;">${bookingId}</span></p>
            <p><strong>Seats:</strong> ${
              Array.isArray(seats) && seats.length ? seats.join(", ") : "N/A"
            }</p>

            <p>🎬 Enjoy the show and don’t forget to grab your popcorn!</p>
          </div>
          ${
            primaryImage
              ? `<img src="${primaryImage}" alt="${title} Poster" style="width: 100%; max-height: 350px; object-fit: cover; border-radius: 4px; margin-top: 16px;" />`
              : ""
          }

          <div style="background-color: #f5f5f5; color: #777; padding: 16px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">Thanks for booking with us!<br>— The TicketShow Team</p>
            <p style="margin: 4px 0 0;">📍 Visit us: <a href="https://ticketshowapp.vercel.app" style="color: #7b2cbf; text-decoration: none;">TicketShow</a></p>
          </div>
        </div>`,
      });

      console.log(`✅ Booking confirmation mail sent for booking ${bookingId}`);
    } catch (error) {
      console.error("❌ Error in sendBookingEmail function:", error);
    }
  }
);

/* ----------------- NEW MOVIE NOTIFICATION EMAIL -------------- */

const sendNewMovieEmail = inngest.createFunction(
  { id: "send-new-movie-notification" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieId } = event.data;
    const users = await User.find({});
    const movie = await Movie.findById(movieId);

    if (!movie) return "No movie found";

    for (const user of users) {
      if (!user.email) continue;

      const userEmail = user.email;

      // ✨ Safe userName for notification email
      const userName = buildSafeName({
        firstName: null,
        lastName: null,
        username: null,
        email: userEmail,
        fallback: user.name,
      });

      const subject = `🎬 New Show Added: ${movie.originalTitle}`;
      const body = `<div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #7b2cbf; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hi ${userName},</h1>
        </div>

        <div style="padding: 24px; color: #333;">
            <h2 style="margin-top: 0;">"${movie.originalTitle}" is Now Available on TicketShow!</h2>
            <p><strong>Release Date:</strong> ${movie.releaseDate}</p>
            <p><strong>Genre:</strong> ${movie.genres?.join(", ")}</p>
            <p>${movie.description}</p>

            <img src="${movie.primaryImage}" alt="${movie.originalTitle} Poster" style="width: 100%; max-height: 350px; object-fit: cover; border-radius: 4px; margin-top: 16px;" />

            <div style="margin-top: 20px; text-align: center;">
              <a href="https://ticketshowapp.vercel.app/movies/${movieId}" style="background-color: #7b2cbf; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">🎟️ Book Your Tickets</a>
            </div>
        </div>

        <div style="background-color: #f5f5f5; color: #777; padding: 16px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">Thanks for staying with TicketShow!<br>We bring the cinema to your fingertips.</p>
            <p style="margin: 4px 0 0;">📍 Visit us: <a href="https://ticketshowapp.vercel.app" style="color: #7b2cbf; text-decoration: none;">TicketShow</a></p>
        </div>
      </div>`;

      await sendEmail({ to: userEmail, subject, body });
    }

    return { message: "Notification sent" };
  }
);

export const functions = [
  userCreated,
  userUpdated,
  userDeleted,
  releaseSeatsandDeletebooking,
  cleanupOldData,
  sendBookingEmail,
  sendNewMovieEmail,
];
