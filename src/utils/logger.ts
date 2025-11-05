export const log = (message: string) => {
  const time = new Date().toISOString();
  console.log(`[${time}] ${message}`);
};
