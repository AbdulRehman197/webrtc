// eslint-disable-next-line no-undef
importScripts("./indexdb.js");

let fileChunks = [];
// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", async (e) => {
  if (typeof e.data === "string") {
    // console.log("filename", fileChunks);
    // Once, all the chunks are received, combine them to form a Blob
    let file = new Blob(fileChunks);
    let UintFile = new Uint8Array(await file.arrayBuffer());
    // console.log("file unit", UintFile);

    let hash = await sha256(UintFile);
    // console.log("hashworker", hash);
    let filename = e.data;
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      fileHash: hash,
    });

    // console.log("message from worker");
    fileChunks = [];
    // eslint-disable-next-line no-undef
    let dbStore = createStore("Directory", "DirHanlders");
    // eslint-disable-next-line no-undef
    let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");
    // eslint-disable-next-line no-undef
    let directoryHandle = await get("directory", dbStore);

    let sliceHash = hash.slice(0, 3);
    const newDirectoryHandle = await directoryHandle.getDirectoryHandle(
      sliceHash,
      {
        create: true,
      }
    );
    directoryHandle = newDirectoryHandle;
    // console.log("new dir", newDirectoryHandle);

    // eslint-disable-next-line no-undef
    await set(filename, { path: sliceHash }, fillDbStore);

    const newFileHandle = await directoryHandle.getFileHandle(
      `${hash}_${filename}`,
      {
        create: true,
      }
    );
    const writableStream = await newFileHandle.createWritable();
    // write our file
    await writableStream.write(file);
    await writableStream.close();

    // close the file and write the contents to disk.
    // // file.download()
    // URL.createObjectURL(file).download();
  } else {
    // Keep appending various file chunks
    // eslint-disable-next-line no-unused-expressions

    fileChunks.push(e.data);
  }
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
