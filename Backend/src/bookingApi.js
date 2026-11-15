import { Router } from 'express';
import * as bookingService from './bookingService.js';
import { calculateEstimate, validateBooking, validateReview } from './bookingRules.js';

const router = Router();

function check(validator, requestProperty) {
  return (request, response, next) => {
    const result = validator(request.body);
    if (result.error) {
      response.status(400).json({ message: result.error });
      return;
    }
    request[requestProperty] = result.value;
    next();
  };
}

async function getBookings(request, response) {
  const bookings = await bookingService.listBookings(request.user.id);
  response.json({ bookings });
}

async function postBooking(request, response) {
  const estimate = calculateEstimate(request.validatedBooking);
  const booking = await bookingService.createBooking({
    customerId: request.user.id,
    ...request.validatedBooking,
    estimatedMin: estimate.min,
    estimatedMax: estimate.max,
  });
  response.status(201).json({ booking });
}

async function postReview(request, response) {
  const review = await bookingService.createReview(
    request.user.id,
    request.params.jobId,
    request.validatedReview,
  );
  response.status(201).json({ review });
}

router.get('/', getBookings);
router.post('/', check(validateBooking, 'validatedBooking'), postBooking);
router.post('/:jobId/reviews', check(validateReview, 'validatedReview'), postReview);

export default router;
