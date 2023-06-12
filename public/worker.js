let fileChunks = [];
let fileReceived = [];

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", async (e) => {


  if (typeof e.data === "string") {
    console.log("filename", fileChunks);
    // Once, all the chunks are received, combine them to form a Blob
    const file = new Blob(fileChunks);

    let UintFile = new Uint8Array(await file.arrayBuffer());
    console.log("file unit", UintFile);

    let hash = await sha256(UintFile);
    console.log("hashworker", hash);

    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      fileHash: hash,
      filedata: {
        name: e.data,
        file,
      },
    });
    fileReceived.push(file);
    console.log("file recevied", file);
    // saveData(file, e.data);
    console.log(fileReceived);
    // eslint-disable-next-line no-restricted-globals
    // self.postMessage({
    //   file: file,
    //   filename: e.data,
    // });
    console.log("message from worker");
    fileChunks = [];
    // // file.download()
    // URL.createObjectURL(file).download();
  } else {
    // Keep appending various file chunks
    fileChunks.push(e.data);
    // const newFileHandle = await e.data.getFileHandle("newworker", {
    //   create: true,
    // });

    // console.log("worker dir", newFileHandle);
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

async function sha256(string) {
  const utf8 = new TextEncoder().encode(string);

  const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
