import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DB_HOST_TEST) console.error("DB_HOST is required!!!");

mongoose
  .connect(process.env.DB_HOST_TEST, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log("MongoDB Connected♥"))
  .catch((err) => console.log(err.message));