import React, { useEffect, useRef, useState } from "react";
import {
  get,
  set,
  keys,
  createStore,
} from "https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js";
import io from "socket.io-client";

const App = () => {
  //   // https://reactjs.org/docs/refs-and-the-dom.html
  let localVideoref = useRef();
  let remoteVideoref = useRef();
  let sandChannel = useRef();
  let socket = useRef(null);
  // let candidates = useRef([]);
  let textref = useRef();
  let pc = useRef();
  let [files, setFiles] = useState([]);
  let [filesName, setFilesName] = useState([]);
  let [dirHandler, setDirHanlder] = useState([]);
  let [dirRecHandler, setRecDirHanlder] = useState([]);
  let [isChrome, setIsChrome] = useState(true);
  let [isChecked, setIsChecked] = useState(false);
  let [store, setStore] = useState("");
  let [connStatus, setConnStatus] = useState("Nothing");
  let [channelStatus, setChannelStatus] = useState("Nothing");
  // let ENDPOINT = "https://fd99rehman.com/";
  let ENDPOINT = "localhost:8080/";

  const worker = new Worker("../worker.js");

  socket = io.connect(ENDPOINT, {
    path: "/webrtc",
    rejectUnauthorized: false,
  });

  // let [chunkState, setChunkState] = useState(false);
  // let [buffer, setBuffer] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");
    // keys(fillDbStore).then((filenames) => {
    //   setFilesName(filenames);
    //   console.log("filenames", filenames);
    // });
    socket.on("connection-success", (success) => {
      console.log(success);
    });

    socket.on("offerOrAnswer", (sdp) => {
      console.log("received sdp", sdp);
      textref.value = JSON.stringify(sdp);

      // set sdp as remote description
      pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("candidate", (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // candidates = [...candidates, candidate]
      pc.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // const pc_config = null
    // const pc_config = nullset

    const pc_config = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    pc.current = new RTCPeerConnection(pc_config, [{ googIPv6: true }]);
    console.log(" pc.current", pc.current);
    // triggered when a new candidate is returned
    pc.current.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        // console.log(JSON.stringify(e.candidate))
        // console.log("candidate", e.candidate);
        sendToPeer("candidate", e.candidate);
      }
    };
    // triggered when there is a change in connection state
    pc.current.oniceconnectionstatechange = (e) => {
      console.log("state", e);
      setTimeout(() => {
        setConnStatus(e.currentTarget.connectionState);
      }, 1000);

      // console.log("channel", sandChannel.current);
    };
    pc.current.onnegotiationneeded = (e) => console.log("negotiaiton", e);
    // triggered when a stream is added to pc, see below - pc.addStream(stream)
    // pc.current.onaddstream = (e) => {
    //   remoteVideoref.current.srcObject = e.stream;
    // };
  }, []);

  // called when getUserMedia() successfully returns - see below
  // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
  // const success = (stream) => {
  //   window.localStream = stream;
  //   localVideoref.current.srcObject = stream;
  //   pc.current.addStream(stream);
  // };

  // called when getUserMedia() fails - see below
  // const failure = (e) => {
  //   console.log("getUserMedia Error: ", e);
  // };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // see the above link for more constraint options
  // const constraints = {
  //   audio: false,
  //   video: true,
  // };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // navigator.mediaDevices.getUserMedia(constraints).then(success).catch(failure);
  // }, []);

  let sendToPeer = (messageType, payload) => {
    socket.emit(messageType, {
      socketID: socket.id,
      payload,
    });
  };

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  let createOffer = () => {
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
      console.log(JSON.stringify(sdp));
      localStorage.setItem("sdp", JSON.stringify(sdp));

      // set offer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
    });
  };

  const createPath = async (path) => {
    // eslint-disable-next-line no-undef
    await CefSharp.BindObjectAsync("FileSystemClass");
    // eslint-disable-next-line no-undef
    await FileSystemClass.createSha256(path);
  };

  worker.addEventListener("message", async (event) => {
    if (navigator.userAgentData.brands.length === 1) {
      let { fileHash } = event.data;
      let sliceHash = fileHash.slice(0, 7);
      await createPath(sliceHash);
    }
  });

  const handelFileHash = async (element) => {
    // setDirHanlder((dirRecHandler) => [...dirRecHandler, newDirectoryHandle]);
  };
  let handleReceiveMessage = async (e) => {
    if (typeof e.data === "string") {
      setFilesName((files) => [...files, e.data]);
    }
    worker.postMessage(e.data);
  };
  async function verifyPermission(fileHandle, readWrite) {
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

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  let createAnswer = () => {
    console.log("Answer");
    pc.current.createAnswer({}).then((sdp) => {
      console.log(JSON.stringify(sdp));
      // set answer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
      console.log("received channel", pc.current);

      pc.current.ondatachannel = async (e) => {
        sandChannel.current = e.channel;
        let dbStore = createStore("Directory", "DirHanlders");
        setStore(dbStore);
        let dbDir = await get("directory", dbStore);
        if (dirRecHandler.length === 0 && dbDir === undefined) {
          let dir = await window.showDirectoryPicker({
            mode: "readwrite",
            startIn: "documents",
          });

          setRecDirHanlder((dirRecHandler) => [...dirRecHandler, dir]);
          await set("directory", dir, dbStore);
          console.log("localDirHandler", dir);
        }
        setRecDirHanlder((dirRecHandler) => [...dirRecHandler, dbDir]);
        sandChannel.current.onmessage = handleReceiveMessage;

        sandChannel.current.onopen = handleChannelStatusChange;
        sandChannel.current.onclose = handleChannelStatusChange;
      };
    });
  };

  const handleChannelStatusChange = async (e) => {
    console.log("rec chnel status", sandChannel.current.readyState);
    setChannelStatus(sandChannel.current.readyState);
  };

  let OfferAgain = () => {
    let sdp = JSON.parse(localStorage.getItem("sdp"));
    // set offer sdp as local description
    pc.current.setLocalDescription(sdp);

    sendToPeer("offerOrAnswer", sdp);
  };
  let handleOnChangeSendFile = (e) => {
    setFiles((files) => [...files, ...e.target.files]);
  };

  let handleSendFiles = async () => {
    let i = 0;
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
      sandChannel.current.send(chunk);
    }

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
    let localDirHandler = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    for await (const entry of localDirHandler.values()) {
      if (entry.kind !== "directory") {
        let file = await entry.getFile();
        setFiles((files) => [...files, file]);
        console.log("files", file);
      }
      setDirHanlder((dirHandler) => [...dirHandler, localDirHandler]);
    }
  };
  const handleGetPermission = async () => {
    let dbStore = createStore("Directory", "DirHanlders");

    let dir = await get("directory", dbStore);
    await verifyPermission(dir, "readwrite");
  };

  return (
    <div>
      <button onClick={createOffer}>Offer</button>
      {/* <button onClick={OfferAgain}> Offer Again</button> */}
      <button onClick={createAnswer}>Answer</button>
      <br />
      <textarea
        style={{ width: 450, height: 40 }}
        ref={(ref) => {
          textref = ref;
        }}
      />

      <button onClick={handleDirectoryHnadler}>Select Files Path</button>
      <button onClick={handleSendFiles}>Send Files</button>
      <button onClick={handleGetPermission}>Get Permission</button>
      <div>
        {filesName.length > 0
          ? filesName.map((filename, i) => (
              <>
                {" "}
                <input
                  type="checkbox"
                  checked={isChecked}
                  id="filename"
                  name="filename"
                />
                <label for="filename"> {filename}</label>
              </>
            ))
          : null}
        <p>conncetoin is {connStatus}</p>
        <p>channel is {sandChannel.current?.readyState}</p>
      </div>
    </div>
  );
};

export default App;
