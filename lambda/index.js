const sharp = require("sharp");
const aws = require("aws-sdk");
const s3 = new aws.S3();

const transformationOptions = [
  {
    name: "w140",
    width: 140,
  },
  {
    name: "w600",
    width: 600,
  },
];

exports.handler = async (event) => {
  try {
    const key = event.Records[0].s3.object.key;
    const keyOnly = key.split("/")[1];
    console.log(`Image Resizing: ${keyOnly}`);

    const ext = key.split(".")[key.split(".").length - 1].toLowerCase();
    console.log(`ext: ${ext}`);

    // 확장자가 jpg면 jpeg로 바꿔줘야한다.
    const requiredFormat = ext === "jpg" ? "jpeg" : ext;

    const image = await s3
      .getObject({ Bucket: "bogobogo", Key: key })
      .promise();

    await Promise.all(
      transformationOptions.map(async ({ name, width }) => {
        try {
          const newKey = `${name}/${keyOnly}`;
          console.log(`newKey: ${newKey}`);
          const resizedImage = await sharp(image.Body)
            .rotate()
            .resize({ width, height: width, fit: "outside" })
            .toFormat(requiredFormat)
            .toBuffer();

          await s3
            .putObject({
              Bucket: "bogobogo",
              Body: resizedImage,
              Key: newKey,
            })
            .promise();
        } catch (error) {
          throw error;
        }
      })
    );

    return {
      statusCode: 200,
      body: event,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: event,
    };
  }
};
