import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DAY_IN_MINUTES } from '../constants.js';
import { BaseProvider } from './base-provider.js';
export class AWSProvider extends BaseProvider {
    s3;
    expires;
    endpoint;
    constructor(options) {
        super(options.bucket);
        this.expires = options.expires ?? DAY_IN_MINUTES;
        this.endpoint = options.endpoint;
        this.s3 = new S3Client({
            region: options.region,
            endpoint: options.endpoint,
            credentials: {
                accessKeyId: options.accessKeyId ?? 'XXX',
                secretAccessKey: options.secretAccessKey ?? 'XXX',
            },
        });
    }
    async upload(file, key) {
        const tmpFile = fs.createReadStream(file.path);
        const params = {
            Bucket: this.bucket,
            Key: key,
            Body: tmpFile,
        };
        if (!this.expires) {
            params.ACL = 'public-read';
        }
        const putObject = new PutObjectCommand(params);
        return this.s3.send(putObject);
    }
    async delete(key, bucket) {
        const deleteObject = new DeleteObjectCommand({
            Key: key,
            Bucket: bucket,
        });
        return this.s3.send(deleteObject);
    }
    async path(key, bucket) {
        if (this.expires) {
            return getSignedUrl(this.s3, new GetObjectCommand({ Key: key, Bucket: bucket }), { expiresIn: this.expires });
        }
        if (this.endpoint) {
            return `${this.endpoint}/${bucket}/${key}`;
        }
        // https://bucket.s3.amazonaws.com/key
        return `https://${bucket}.s3.amazonaws.com/${key}`;
    }
}
