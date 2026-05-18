import type { S3Event, S3Handler } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import csv from "csv-parser";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const s3 = new S3Client({});

const sqs = new SQSClient({});
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

export const handler: S3Handler = async (event: S3Event) => {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = obj.Body as Readable;

  await new Promise<void>((resolve, reject) => {
    const sqsPromises: Promise<any>[] = [];
    body
      .pipe(csv())
      .on("data", (row: Record<string, unknown>) => {
        sqsPromises.push(
          sqs.send(
            new SendMessageCommand({
              QueueUrl: SQS_QUEUE_URL,
              MessageBody: JSON.stringify(row),
            }),
          ),
        );
      })
      .on("end", async () => {
        try {
          await Promise.all(sqsPromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });

  const parsedKey = key.replace(/^uploaded\//, "parsed/");

  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: parsedKey,
    }),
  );

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  console.log("moved file to parsed folder:", { bucket, key, parsedKey });
};
