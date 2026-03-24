import minioClient from "@/config/minIOConfig";

export const generatePreSignedUrl = async (
  objectName: string,
  bucketName: string,
  expTime: number
): Promise<string> => {
  try {
    const presignedURL = await minioClient.presignedPutObject(
      bucketName,
      objectName,
      expTime
    );
    return presignedURL;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Could not generate presigned URL.");
  }
};

export const deleteObject = async (
  bucketName: string,
  objectName: string
): Promise<void> => {
  try {
    await minioClient.removeObject(bucketName, objectName);
    console.log(
      `Successfully deleted '${objectName}' from bucket '${bucketName}'.`
    );
  } catch (error) {
    console.error(
      `Error deleting object '${objectName}' from bucket '${bucketName}':`,
      error
    );
    throw new Error("Failed to delete object from storage.");
  }
};

export const renameObject = async (
  bucketName: string,
  oldObjectName: string,
  newObjectName: string
): Promise<void> => {
  try {
    await minioClient.copyObject(
      bucketName,
      newObjectName,
      `/${bucketName}/${oldObjectName}`
    );
    console.log(
      `Successfully copied '${oldObjectName}' to '${newObjectName}'.`
    );

    await minioClient.removeObject(bucketName, oldObjectName);
    console.log(`Successfully deleted original object '${oldObjectName}'.`);
  } catch (error) {
    console.error("Error renaming object:", error);
    throw new Error("Failed to rename object in storage.");
  }
};

export const getObject = async (bucketName: string, objectName: string) => {
  const dataStream = await minioClient.getObject(bucketName, objectName);
  const chunks: Buffer[] = [];

  for await (const chunk of dataStream) {
    chunks.push(chunk as Buffer);
  }

  const fullBuffer = Buffer.concat(chunks);

  return fullBuffer;
};

export const getObjectStream = async (
  bucketName: string,
  objectName: string
) => {
  const dataStream = await minioClient.getObject(bucketName, objectName);
  return dataStream;
};
