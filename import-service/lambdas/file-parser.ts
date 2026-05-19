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
import type { ParsedProductRow } from "./validate-csv";
import { validateHeaders, validateAndMapRow } from "./validate-csv";

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
        const validRows: ParsedProductRow[] = [];
        let validationError: Error | null = null;

        body
            .pipe(csv())
            .on("headers", (headers: string[]) => {
                const missingHeaders = validateHeaders(headers);
                if (missingHeaders.length > 0) {
                    validationError = new Error(
                        `CSV is missing required headers: ${missingHeaders.join(", ")}`,
                    );
                }
            })
            .on("data", (row: Record<string, unknown>) => {
                if (validationError) {
                    return;
                }

                try {
                    validRows.push(validateAndMapRow(row));
                } catch (err) {
                    validationError = err as Error;
                }
            })
            .on("end", async () => {
                if (validationError) {
                    reject(validationError);
                    return;
                }

                try {
                    await Promise.all(
                        validRows.map((row) =>
                            sqs.send(
                                new SendMessageCommand({
                                    QueueUrl: SQS_QUEUE_URL,
                                    MessageBody: JSON.stringify(row),
                                }),
                            ),
                        ),
                    );
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
