import fs from "fs";

export const logToFile = (message: string, filePath: string) => {
  const formattedMessage = `${new Date().toISOString()} - ${message}`;
  console.log(formattedMessage);
  try {
    if (fs.existsSync(filePath)) {
      fs.appendFileSync(filePath, formattedMessage);
    } else {
      fs.writeFileSync(filePath, formattedMessage);
    }
  } catch (err) {
    console.error(err);
  }
};

export const encodeURISafe = (stringFragment: string) =>
  encodeURIComponent(stringFragment).replace(/'/g, "%27").replace(/"/g, "%22");
