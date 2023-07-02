// eslint-disable-next-line no-undef
importScripts("./indexdb.js");
// eslint-disable-next-line no-undef
let dbStore = createStore("Directory", "DirHanlders");
// eslint-disable-next-line no-undef
let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");

let fileChunks = [];
// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", async (e) => {
  if (e.data.type === "filename") {
    // console.log("filename", fileChunks);
    // Once, all the chunks are received, combine them to form a Blob
    let file = new Blob(fileChunks);
    let UintFile = new Uint8Array(await file.arrayBuffer());
    // console.log("file unit", UintFile);

    let hash = await sha256(UintFile);
    // console.log("hashworker", hash);
    let filename = e.data.data;
    // eslint-disable-next-line no-restricted-globals
    // self.postMessage({
    //   fileHash: hash,
    // });

    // console.log("message from worker");
    fileChunks = [];
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

    const newFileHandle = await directoryHandle.getFileHandle(filename, {
      create: true,
    });
    const writableStream = await newFileHandle.createWritable();
    // write our file
    await writableStream.write(file);
    await writableStream.close();

    // close the file and write the contents to disk.
    // // file.download()
    // URL.createObjectURL(file).download();
  } else if (e.data.type === "chunk") {
    fileChunks.push(e.data.data);
  } else if (e.data.type === "selectAll") {
    // eslint-disable-next-line no-undef
    // let dir = await get("directory", dbStore);
    let getPath = e.data.data.map(async (filename) => {
      // eslint-disable-next-line no-undef
      let value = await get(filename, fillDbStore);

      let path = await value;
      return {
        filename,
        ...path,
      };
    });
    // eslint-disable-next-line no-undef
    // let getPath = await getMany(filesInfo, fillDbStore);
    getPath = await Promise.all(getPath);
    console.log("getPath", getPath);
    let dirhandlers = getPath.map(async (getPath) => {
      const newDirectoryHandle = await e.data.store.getDirectoryHandle(
        getPath.path,
        {
          create: false,
        }
      );
      const newFileHandle = await newDirectoryHandle.getFileHandle(
        getPath.filename,
        {
          create: true,
        }
      );

      return newFileHandle.getFile();
    });
    // .queryPermission(options)
    let getFiles = await Promise.all(dirhandlers);
    console.log("dirhandlers", getFiles);
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({
      type: "readFiles",
      data: getFiles,
    });
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
