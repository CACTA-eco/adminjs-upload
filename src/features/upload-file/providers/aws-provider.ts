import { UploadedFile } from 'adminjs'
import fs from 'fs'
// eslint-disable-next-line import/no-extraneous-dependencies
import { DeleteObjectCommand, DeleteObjectCommandOutput, GetObjectCommand, PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
// eslint-disable-next-line import/no-extraneous-dependencies
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DAY_IN_MINUTES } from '../constants.js'
import { BaseProvider } from './base-provider.js'

/**
 * AWS Credentials which can be set for S3 file upload.
 * If not given, 'aws-sdk' will try to fetch them from
 * environmental variables.
 * @memberof module:@adminjs/upload
 */
export type AWSOptions = {
  /**
   * AWS IAM accessKeyId. By default its value is taken from AWS_ACCESS_KEY_ID env variable
  */
  accessKeyId?: string;
  /**
   * AWS IAM secretAccessKey. By default its value is taken from AWS_SECRET_ACCESS_KEY env variable
   */
  secretAccessKey?: string;
  /**
   * AWS region where your bucket was created.
  */
  region: string;
  /**
   * S3 Bucket where files will be stored
   */
  bucket: string;
  /**
   * indicates how long links should be available after page load (in minutes).
   * Default to 24h. If set to 0 adapter will mark uploaded files as PUBLIC ACL.
   */
  expires?: number;

  /**
   * AWS endpoint. By default it is set to 's3.amazonaws.com'
   */
  endpoint?: string;
}

export class AWSProvider extends BaseProvider {
  protected s3: S3Client

  public expires: number

  public endpoint?: string

  constructor(options: AWSOptions) {
    super(options.bucket)

    this.expires = options.expires ?? DAY_IN_MINUTES
    this.endpoint = options.endpoint
    this.s3 = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      credentials: {
        accessKeyId: options.accessKeyId ?? 'XXX',
        secretAccessKey: options.secretAccessKey ?? 'XXX',
      },
    })
  }

  public async upload(file: UploadedFile, key: string): Promise<PutObjectCommandOutput> {
    const tmpFile = fs.createReadStream(file.path)
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: tmpFile,
    }
    if (!this.expires) {
      params.ACL = 'public-read'
    }

    const putObject = new PutObjectCommand(params)

    return this.s3.send(putObject)
  }

  public async delete(key: string, bucket: string): Promise<DeleteObjectCommandOutput> {
    const deleteObject = new DeleteObjectCommand({
      Key: key,
      Bucket: bucket,
    })
    return this.s3.send(deleteObject)
  }

  public async path(key: string, bucket: string): Promise<string> {
    if (this.expires) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Key: key, Bucket: bucket }),
        { expiresIn: this.expires },
      )
    }

    if (this.endpoint) {
      return `${this.endpoint}/${bucket}/${key}`
    }

    // https://bucket.s3.amazonaws.com/key
    return `https://${bucket}.s3.amazonaws.com/${key}`
  }
}
