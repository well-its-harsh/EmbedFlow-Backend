import app from "@/app";
import config from "@/config/config";
import { connectPrisma } from "@/database/prisma";

const startServer = async () => {
  await connectPrisma();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
};

startServer();
