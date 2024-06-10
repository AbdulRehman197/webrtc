import React, { useEffect, useRef, useState } from "react";
import {
  get,
  set,
  keys,
  entries,
  getMany,
  createStore,
} from "./indexdb.js";
import { socket } from "./socket";
// import io from "socket.io-client";
import Checkbox from "./checkbox";
import sha256 from "./sha256";

const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});

const App = () => {
  //   // https://reactjs.org/docs/refs-and-the-dom.html

  let sandChannel = useRef();
  // let socket = useRef(null);
  // let candidates = useRef([]);
  let textref = useRef();
  let pc = useRef();
  let [files, setFiles] = useState([]);
  let [filesName, setFilesName] = useState([]);
  let [isDirPermited, setIsDirPermited] = useState(false);
  let [dirHanlder, setDirHandler] = useState("");
  let [dirRecHandler, setRecDirHanlder] = useState([]);
  let [isChrome, setIsChrome] = useState(true);
  let [isChecked, setIsChecked] = useState(false);
  let [store, setStore] = useState("");
  let [connStatus, setConnStatus] = useState("");
  let [channelStatus, setChannelStatus] = useState("");
  const [checked, setChecked] = useState([]);
  let [offerVisible, setOfferVisible] = useState(true);
  let [answerVisible, setAnswerVisible] = useState(true);
  // let ENDPOINT = "https://fd99rehman.com/";
  // let ENDPOINT = "localhost:8080/";
  // const worker = new Worker("../worker.js");
  // let socket = io.connect(ENDPOINT, {
  //   path: "/webrtc",
  //   rejectUnauthorized: false,
  // });
  // let getFielsName = async () => {
  //   let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");
  //   let newfiles = await keys(fillDbStore);
  //   let newfileNames = await newfiles;
  //   return await newfileNames;
  // };
  // console.log("filesNames", getFielsName());
  useEffect(() => {
    let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");
    keys(fillDbStore).then((dbFilesName) => {
      // console.log("entries", dbFilesName);
      setFilesName(dbFilesName);
    });
    console.log("called");

    socket.on("connection-success", (success) => {
      console.log(success);
    });

    socket.on("offerOrAnswer", (sdp) => {
      console.log("received sdp", sdp.type);
      // textref.value = JSON.stringify(sdp);

      if (sdp.type === "offer") {
        setAnswerVisible(true);
        setOfferVisible(false);
        setConnStatus("Someone is Calling....");
      }

      pc.current.setRemoteDescription(new RTCSessionDescription(sdp));

      // set sdp as remote description
    });

    socket.on("candidate", (candidate) => {
      console.log("recevied candidate",candidate)
      pc.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    const pc_config = {
      iceServers: [
      {urls: "turn:100.25.188.111:3478",
        username: " ",
        password: " "
      }
        // { urls: "stun:stun.l.google.com:19302" },
        // { urls: "stun:stun1.l.google.com:19302" },
        // { urls: "stun:stun2.l.google.com:19302" },
        // { urls: "stun:stun3.l.google.com:19302" },
        // { urls: "stun:stun4.l.google.com:19302" },
      ],
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    pc.current = new RTCPeerConnection(pc_config, [{ googIPv6: true }]);
    // console.log("peerconn", pc)
    // triggered when a new candidate is returned
    pc.current.onicecandidate = (e) => {
      console.log("candidate", e.candidate)
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        sendToPeer("candidate", e.candidate);
      }
    };
    // triggered when there is a change in connection state
    pc.current.onconnectionstatechange = (e) => {
      if (pc.current.connectionState === "connected") {
        setConnStatus(pc.current.connectionState);
      } else {
        setConnStatus(pc.current.connectionState);
        setOfferVisible(true);
      }
      if (
        pc.current.connectionState === "disconnected" ||
        pc.current.connectionState === "failed"
      ) {
        window.location.reload(true);
      }
    };

    return () => {
      socket.off("connection-success", (success) => {
        console.log(success);
      });

      socket.off("offerOrAnswer", (sdp) => {
        console.log("received sdp", sdp.type);
        // textref.value = JSON.stringify(sdp);

        if (sdp.type === "offer") {
          setAnswerVisible(true);
          setOfferVisible(false);
          setConnStatus("Someone is Calling....");
        }
        console.log("sdp",sdp)
        pc.current.setRemoteDescription(new RTCSessionDescription(sdp));

        // set sdp as remote description
      });

      socket.off("candidate", (candidate) => {
        pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      });
    };
  }, []);

  let sendToPeer = (messageType, payload) => {
    socket.emit(messageType, {
      socketID: socket.id,
      payload,
    });
  };

  const handleChannelStatusChange = async (e) => {
    setChannelStatus(sandChannel.current.readyState);
  };

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  let createOffer = async () => {
    console.log("Offer");

    sandChannel.current = pc.current.createDataChannel("sendChannel", {
      reliable: false,
    });
    sandChannel.current.onmessage = handleReceiveMessage;
    sandChannel.current.onopen = handleChannelStatusChange;
    sandChannel.current.onclose = handleChannelStatusChange;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    pc.current.createOffer({}).then((sdp) => {
      // console.log(JSON.stringify(sdp))
      // console.log(JSON.stringify(sdp));
      localStorage.setItem("sdp", JSON.stringify(sdp));
      // set offer sdp as local description
      pc.current.setLocalDescription(sdp);
      sendToPeer("offerOrAnswer", sdp);
    });
    setConnStatus("Calling....");
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  let createAnswer = async () => {
    console.log("Answer");

    pc.current.createAnswer({}).then((sdp) => {
      // console.log(JSON.stringify(sdp));
      // set answer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
      // console.log("received channel", pc.current);
      // setStatus("Connection is Established");

      pc.current.ondatachannel = async (e) => {
        sandChannel.current = e.channel;
        // let dbStore = createStore("Directory", "DirHanlders");
        // setStore(dbStore);
        // let dbDir = await get("directory", dbStore);
        // if (dirRecHandler.length === 0 && dbDir === undefined) {
        //   let dir = await window.showDirectoryPicker({
        //     mode: "readwrite",
        //     startIn: "documents",
        //   });

        //   setIsDirPermited(true);
        //   await set("directory", dir, dbStore);
        //   // console.log("localDirHandler", dir);
        // }
        // setRecDirHanlder((dirRecHandler) => [...dirRecHandler, dbDir]);
        sandChannel.current.onmessage = handleReceiveMessage;

        sandChannel.current.onopen = handleChannelStatusChange;
        sandChannel.current.onclose = handleChannelStatusChange;
      };
    });
  };

  // let OfferAgain = () => {
  //   let sdp = JSON.parse(localStorage.getItem("sdp"));
  //   // set offer sdp as local description
  //   pc.current.setLocalDescription(sdp);

  //   sendToPeer("offerOrAnswer", sdp);
  // };
  let handleReceiveMessage = async (e) => {
    let data = e.data;
    // console.log("incoming data", data);
    if (typeof data === "string") {
      console.log("end of file");
      setFilesName((files) => [...files, data]);
      console.log("file name set", data);
      worker.postMessage({
        type: "filename",
        data: data,
      });
    } else {
      worker.postMessage({
        type: "chunk",
        data: data,
      });
    }
  };
  worker.addEventListener("message", async (event) => {
    console.log("coming event", event.data);
    if (event.data.type === "readFiles") {
      setFiles(event.data.data);
    }
  });

   const verifyPermission = async (fileHandle, readWrite) =>  {
    const options = {};
    if (readWrite) {
      options.mode = "readwrite";
    }
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === "granted") {
      return true;
    }
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === "granted") {
      return true;
    }
    // The user didn't grant permission, so return false.
    return false;
  }

  const serlizedData = (dataInfo) => {
    let { type, data } = dataInfo;
    let finalBuffer;
    // let typeSha = await sha256(type);
    // console.log("sha", typeSha);
    let typeBuffer = new TextEncoder().encode(type);
    // console.log("shabufer", data);

    // console.log("typeShalength", typeSha.length);
    if (typeof data !== "string") {
      finalBuffer = _appendBuffer(new Uint8Array(data), typeBuffer);
    } else {
      let fileName = new TextEncoder().encode(data);
      // console.log("filename buffer", fileName);

      finalBuffer = _appendBuffer(fileName, typeBuffer);
    }
    return finalBuffer;
  };
  var _appendBuffer = function (buffer1, buffer2) {
    let buffer = new Uint8Array([...buffer1, ...buffer2]).buffer;
    // console.log("finalbuffer buffer", buffer);
    return buffer;
  };
  let handleSendFiles = async () => {
    let i = 0;
    // console.log("fiels", files);
    let buffer = await files[i].arrayBuffer();
    handleSendFile(i, buffer);
    buffer = "";
  };
  let newbuffer = "";
  let n = 0;
  const handleSendFile = async (i, buffer) => {
    // newbuffer = buffer
    if (buffer === undefined) {
      buffer = newbuffer;
      // i = n;
      i = n;
    }
    // console.log("buffer", buffer);
    while (buffer.byteLength) {
      if (
        sandChannel.current.bufferedAmount >
        sandChannel.current.bufferedAmountLowThreshold
      ) {
        // eslint-disable-next-line no-loop-func
        sandChannel.current.onbufferedamountlow = () => {
          console.log("fired");
          sandChannel.current.onbufferedamountlow = null;
          handleSendFile(i);
        };
        return;
      }
      const chunkSize = 256 * 1024;
      const chunk = buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize, buffer.byteLength);
      // Off goes the chunk!
      newbuffer = buffer;
      // console.log("chunk type", chunk);
      // let data = { type: "chunk", data: chunk };
      // let finalArrayBuffer = serlizedData(data);
      // console.log("finalArrayBuffer", finalArrayBuffer);

      sandChannel.current.send(chunk);
      // data = JSON.stringify(data);
      // data = new TextEncoder().encode(data);
      // console.log("arraybuffer of data", data);
      // data = new TextDecoder().decode(data);
      // data = JSON.parse(data);
      // console.log("data from array buffer", data);
    }
    // let data = { type: "filename", data: files[i].name };
    // let finalArrayBuffer = serlizedData(data);
    sandChannel.current.send(files[i].name);

    newbuffer = "";

    if (i < files.length - 1) {
      if (i === 0) {
        i = n;
      }
      i = i + 1;
      n = i;
      buffer = await files[i].arrayBuffer();
      handleSendFile(i, buffer);
    }
  };

  const handleDirectoryHnadler = async () => {
    setFiles([]);
    let dbStore = createStore("Directory", "DirHanlders");
    let localDirHandler = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    for await (const entry of localDirHandler.values()) {
      if (entry.kind !== "directory") {
        let file = await entry.getFile();
        setFiles((files) => [...files, file]);
        // console.log("files", file);
      }
    }
    setIsDirPermited(true);
    await set("directory", localDirHandler, dbStore);
  };
  const handleGetPermission = async () => {
    let dbStore = createStore("Directory", "DirHanlders");

    let dir = await get("directory", dbStore);
    if (dir === undefined) {
      let newdir = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      // setRecDirHanlder((dirRecHandler) => [...dirRecHandler, newdir]);
      setStore(newdir);
      await set("directory", newdir, dbStore);
    }
else{
  setStore(dir);
  debugger
  await verifyPermission(dir, "readwrite");

  // setDirHandler(dir);
  setIsDirPermited(true);
}
  };
  // const fetchFromDb = () => {
  //   let ItemsKeys = [];

  //   console.log("keys", ItemsKeys);
  //   return ItemsKeys;
  // };

  const handleOnChange = (e, name) => {
    if (e.target.checked) {
      setChecked([...checked, name]);
      getFilsFromDb([...checked, name]);
    } else {
      setChecked(checked.filter((item) => item !== name));
    }
  };

  const handleCheckAllChange = (e) => {
    if (e.target.checked) {
      // const allCountries = filesName.map((c) => c);
      setChecked(filesName);
      getFilsFromDb(filesName);
    } else {
      setChecked([]);
    }
  };

  const getFilsFromDb = async (filesInfo) => {
    // let dbStore = createStore("Directory", "DirHanlders");
    // let dir = await get("directory", dbStore);
    await verifyPermission(store, "readwrite");
    // console.log("filesInfo", filesInfo);

    worker.postMessage({
      type: "selectAll",
      data: filesInfo,
      store: store,
    });
  };
  return (
    <div>
      <br />
      <textarea
        style={{ width: 450, height: 40, display: "none" }}
        ref={(ref) => {
          textref = ref;
        }}
      />
      {connStatus === "connected" &&
      sandChannel.current?.readyState === "open" ? (
        <div>
          <button onClick={handleDirectoryHnadler}>Select Files Path</button>
          <button onClick={handleSendFiles}>Send Files</button>

          <div>
            {filesName.length > 0 ? (
              <>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="selectAll"
                  htmlFor="selectall"
                  checked={checked.length === filesName.length}
                  onChange={handleCheckAllChange}
                />
                <label className="form-check-label" htmlFor="selectAll">
                  Select all
                </label>
              </>
            ) : null}
            {filesName.length > 0
              ? filesName
                  .filter((item, pos) => filesName.indexOf(item) === pos)
                  .map((filename, i) => (
                    <div key={i}>
                      {" "}
                      <input
                        key={i}
                        type="checkbox"
                        checked={checked.includes(filename)}
                        id="filename"
                        name="filename"
                        onChange={(e) => handleOnChange(e, filename)}
                      />
                      <label htmlFor="filename"> {filename}</label>
                    </div>
                  ))
              : null}
          </div>
        </div>
      ) : (
        <div>
          {offerVisible ? (
            <button
              disabled={isDirPermited ? false : true}
              onClick={createOffer}
            >
              Offer
            </button>
          ) : (
            <button
              disabled={isDirPermited ? false : true}
              onClick={createAnswer}
            >
              Answer
            </button>
          )}
          {!isDirPermited ? (
            <button onClick={handleGetPermission}>Get Permission</button>
          ) : null}

          {/* <button onClick={OfferAgain}> Offer Again</button> */}
        </div>
      )}

      <p> {connStatus}</p>
      <p>channel is {sandChannel.current?.readyState}</p>
      <p>{checked.join(", ")}</p>
    </div>
  );
};

export default App;
