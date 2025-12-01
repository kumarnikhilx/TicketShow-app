import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    // Agar logged-in hi nahi hai
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const user = await clerkClient.users.getUser(userId);

    // Agar admin nahi hai
    if (user?.privateMetadata?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not Authorized (Admin only)",
      });
    }

    // Sab sahi → aage jao
    return next();
  } catch (error) {
    console.error("Error in protectAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Not Authorized",
    });
  }
};
