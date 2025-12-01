import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

// ✅ Check the user is admin or not
// NOTE: Is route pe already protectAdmin lagaa hua hai,
// isiliye yaha sirf success response dena kaafi hai.
export const isAdmin = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      isAdmin: true,
    });
  } catch (error) {
    console.error("Error in isAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ✅ API to get dashboard data
export const adminDashboarddata = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });

    const activeshows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const totalUsers = await User.countDocuments();

    const dashboarddata = {
      totalUsers,
      totalRevenue: bookings.reduce(
        (accumulator, booking) => accumulator + (booking.amount || 0),
        0
      ),
      totalBookings: bookings.length,
      activeshows,
    };

    return res.status(200).json({
      success: true,
      dashboarddata,
    });
  } catch (error) {
    console.error("Error in adminDashboarddata:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ API to get all upcoming shows
export const getallshows = async (req, res) => {
  try {
    const showdata = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    return res.status(200).json({
      success: true,
      showdata,
    });
  } catch (error) {
    console.error("Error in getallshows:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ API to get all bookings
export const getbookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user")
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Error in getbookings:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
