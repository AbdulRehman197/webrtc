// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", async (e) => {
  console.log("buffer", e.data);
  // let { buffer } = new ArrayBuffer(e.data);
  const chunkSize = 16 * 1024;
  const chunk = e.data.slice(0, chunkSize);
  let buffer = e.data.slice(chunkSize, e.data.byteLength);
  // eslint-disable-next-line no-restricted-globals
  self.postMessage({ buffer: buffer, chunk: chunk });
});
