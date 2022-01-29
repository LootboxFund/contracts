// Needed to slow down transactions to avoid "replacement fee too low" errors...
export const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
