import mongoose from "mongoose";
import Theater from "../models/Theater";
import throwError from "../utils/throwError";
import Review from "../models/Review";

export const getTheater = async (req, res, next) => {
  try {
    const { sort, page = 0 } = req.query;

    const variable =
      sort === "review" ? { reviewCount: -1, name: 1 } : { name: 1 };
    const theater = await Theater.find(
      {},
      { review: 0, createdAt: 0, updatedAt: 0, __v: 0 }
    )
      .sort(variable)
      .skip(page * 10)
      .limit(10);

    res.status(200).json({ success: true, data: theater });
  } catch (error) {
    next(error);
  }
};

export const getTheaterDetail = async (req, res, next) => {
  try {
    const { theaterId } = req.params;
    if (!mongoose.isValidObjectId(theaterId)) {
      return next(throwError(400, "theaterId가 유효하지 않습니다."));
    }

    const theater = await Theater.findById(theaterId, {
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
      "review.__v": 0,
      "review.createAt": 0,
      "review.updatedAt": 0,
    });

    theater.review = theater.review.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });

    res.status(200).json({ success: true, data: theater });
  } catch (error) {
    next(error);
  }
};

export const getReview = async (req, res, next) => {
  try {
    const { fcltynm, page = 0 } = req.query;
    if (!fcltynm) {
      return next(throwError(400, "query에 fcltynm이 없습니다."));
    }

    const review = await Review.find(
      { fcltynm },
      {
        likes: 0,
        fcltynm: 0,
        prfnm: 0,
        createAt: 0,
        createdAt: 0,
        updatedAt: 0,
        __v: 0,
        casting: 0,
      }
    )
      .sort({ _id: -1 })
      .skip(page * 10)
      .limit(10);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};
