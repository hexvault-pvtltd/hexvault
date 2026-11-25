import { CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  throw new Error("S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required.");
}

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://rustfs:9000",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});
const appOrigin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let lastError;

for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchBucket") {
      try {
        await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
        console.log("Private object-storage bucket was created.");
      } catch (createError) {
        if (createError?.name !== "BucketAlreadyOwnedByYou" && createError?.$metadata?.httpStatusCode !== 409) {
          lastError = createError;
          await sleep(2000);
          continue;
        }
      }
    } else {
      lastError = error;
      await sleep(2000);
      continue;
    }
  }

  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: S3_BUCKET,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: [appOrigin],
          AllowedMethods: ["POST", "PUT"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 600,
        }],
      },
    }));
    console.log(`Private object-storage bucket is ready for browser uploads from ${appOrigin}.`);
    process.exit(0);
  } catch (corsError) {
    lastError = corsError;
    await sleep(2000);
  }
}

console.error("Object storage did not become ready within two minutes.", lastError?.name ?? "unknown_error", lastError?.message ?? "");
process.exit(1);
