let array = [];
let fileChunks = [];
let fileReceived = [];

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", (e) => {
  if (typeof e.data === "string") {
    // Once, all the chunks are received, combine them to form a Blob
    const file = new Blob(fileChunks);
    fileReceived.push(file);
    console.log("file recevied", file);
    // saveData(file, e.data);
    console.log(fileReceived);
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      file: file,
      filename: e.data,
    });

    fileChunks = [];
    // // file.download()
    // URL.createObjectURL(file).download();
  } else {
    // Keep appending various file chunks
    fileChunks.push(e.data);
  }
  // if (e.data === "download") {
  //   const blob = new Blob(array);
  //   // eslint-disable-next-line no-restricted-globals
  //   self.postMessage(blob);
  //   array = [];
  // } else {
  //   array.push(e.data);
  // }
});
