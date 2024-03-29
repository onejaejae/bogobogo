import mongoose from "mongoose";
import Review from "../models/Review";
import Theater from "../models/Theater";
import User from "../models/User";
import Show from "../models/Show";
import Like from "../models/Like";
import throwError from "../utils/throwError";

export const getReviewDetail = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    const review = await Review.findById(reviewId, {
      createAt: 0,
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
    });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

export const postReview = async (req, res, next) => {
  try {
    const { fcltynm, showId } = req.body;

    const [user, show] = await Promise.all([
      User.findById(req.id),
      Show.findById(showId),
    ]);

    const result =
      (show.totalRating + req.body.reviewRating) / (show.reviewNumber + 1);

    req.body.writer = user;
    const newReview = new Review(req.body);

    const [review] = await Promise.all([
      newReview.save(),
      Theater.updateOne(
        { name: fcltynm },
        {
          $inc: { reviewCount: 1 },
          $push: { review: { $each: [newReview], $slice: -10 } },
        }
      ),
      Show.findByIdAndUpdate(showId, {
        $inc: { reviewNumber: 1 },
        rating: result.toFixed(1),
        totalRating: show.totalRating + req.body.reviewRating,
      }),
      User.findByIdAndUpdate(req.id, {
        $addToSet: { writeReviews: newReview.id },
      }),
    ]);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

export const patchReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    const [updateReview, theater] = await Promise.all([
      Review.findByIdAndUpdate(reviewId, req.body, {
        new: true,
        projection: { createAt: 0, createdAt: 0, updatedAt: 0, __v: 0 },
      }),
      Theater.findOne({ "review._id": reviewId }),
    ]);

    if (theater) {
      theater.review = theater.review.filter((r) => r.id !== reviewId);
      theater.review.unshift(updateReview);
      await theater.save();
    }

    res.status(200).json({ success: true, data: updateReview });
  } catch (error) {
    next(error);
  }
};

export const patchLike = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    const like = new Like({ userId: req.id, reviewId });

    await Promise.all([
      like.save(),
      Review.findByIdAndUpdate(
        reviewId,
        {
          $inc: { likeNumber: 1 },
        },
        { new: true }
      ),
      User.findByIdAndUpdate(req.id, {
        $addToSet: { likeReviews: reviewId },
      }),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const patchUnlike = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    await Promise.all([
      Like.findOneAndDelete({ reviewId }),
      Review.findByIdAndUpdate(
        reviewId,
        {
          $inc: { likeNumber: -1 },
        },
        { new: true }
      ),
      User.findByIdAndUpdate(req.id, {
        $pull: { likeReviews: reviewId },
      }),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const patchReport = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    await Promise.all([
      Review.findByIdAndUpdate(reviewId, { $inc: { reportNumber: 1 } }),
      User.findByIdAndUpdate(req.id, {
        $addToSet: { reportReviews: reviewId },
      }),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.isValidObjectId(reviewId)) {
      return next(throwError(400, "reviewId가 유효하지 않습니다."));
    }

    const review = await Review.findById(reviewId);

    const [show, theater] = await Promise.all([
      Show.findById(review.showId),
      Theater.findOne({ name: review.fcltynm }),
    ]);

    const totalRating = show.totalRating - review.reviewRating;
    let rating;
    if (show.reviewNumber - 1 === 0) {
      rating = 0;
    } else {
      rating = totalRating / (show.reviewNumber - 1);
    }

    if (theater.review.find((r) => r.id === reviewId)) {
      theater.review = theater.review.filter((r) => r.id !== reviewId);
      if (theater.review.length > 0) {
        const newReview = await Review.findOne({
          fcltynm: theater.name,
          _id: { $lt: theater.review[0].id },
        }).sort({ _id: -1 });

        if (newReview && newReview.id !== reviewId)
          theater.review.unshift(newReview);
      }
    }
    theater.reviewCount -= 1;
    await Promise.all([
      theater.save(),
      Review.findByIdAndDelete(reviewId),
      Show.findByIdAndUpdate(review.showId, {
        rating: rating.toFixed(1),
        totalRating,
        $inc: {
          reviewNumber: -1,
        },
      }),
      User.findByIdAndUpdate(req.id, {
        $pull: { writeReviews: reviewId },
      }),
      User.updateMany({}, { $pull: { likeReviews: reviewId } }),
      Like.deleteMany({ reviewId }),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
