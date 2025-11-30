import express from 'express';
import { createBooking, getoccupiedSeats, verifyPayment } from '../Control/Bookingscontrol.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.post('/verify', verifyPayment);
bookingRouter.get('/seats/:showId', getoccupiedSeats);

export default bookingRouter;
