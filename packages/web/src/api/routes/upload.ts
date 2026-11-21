import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authed } from "../middleware/auth";
import { publicUrl, s3 } from "../lib/s3";

const safe = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "fichier";

/** URL d'envoi direct (PUT) vers le stockage ; le fichier est public via une clé aléatoire. */
export const upload = {
  presign: authed
    .input(z.object({ filename: z.string().min(1), contentType: z.string() }))
    .handler(async ({ context, input }) => {
      const key = `etab/${context.user.id}/${crypto.randomUUID()}-${safe(input.filename)}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: input.contentType || "application/octet-stream", ACL: "public-read" }),
        { expiresIn: 600, signableHeaders: new Set(["x-amz-acl"]) },
      );
      return { url, key, publicUrl: publicUrl(key) };
    }),
};
