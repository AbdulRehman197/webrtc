import React, { useEffect, useRef, useState } from "react";
import { get, set } from "https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js";
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
  let [text, setText] = useState("");
  let [messages, setMessage] = useState([]);
  let [files, setFiles] = useState([]);
  let [dirHandler, setDirHanlder] = useState([]);
  let [dirRecHandler, setRecDirHanlder] = useState([]);
  let [isChrome, setIsChrome] = useState(true);
  // let ENDPOINT = "https://fd99rehman.com/";
  let ENDPOINT = "localhost:8080/";

  const worker = new Worker("../worker.js");

  socket = io.connect(ENDPOINT, {
    path: "/webrtc",
    rejectUnauthorized: false,
  });
  // useEffect(() => {
  //
  // },[]);
  // let [chunkState, setChunkState] = useState(false);
  // let [buffer, setBuffer] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
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
      // console.log("channel", sandChannel.current);
    };
    pc.current.onnegotiationneeded = (e) => console.log("negotiaiton", e);
    // triggered when a stream is added to pc, see below - pc.addStream(stream)
    pc.current.onaddstream = (e) => {
      remoteVideoref.current.srcObject = e.stream;
    };

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream;
      localVideoref.current.srcObject = stream;
      pc.current.addStream(stream);
    };

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log("getUserMedia Error: ", e);
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      audio: false,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(success)
      .catch(failure);
  }, []);

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
    sandChannel.current.onopen = handleSendChannelStatusChange;
    sandChannel.current.onclose = handleSendChannelStatusChange;
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    pc.current.createOffer({ offerToReceiveVideo: 1 }).then((sdp) => {
      // console.log(JSON.stringify(sdp))
      console.log(JSON.stringify(sdp));
      localStorage.setItem("sdp", JSON.stringify(sdp));

      // set offer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
    });
  };
  const handleSendChannelStatusChange = async (event) => {
    console.log("send channel status: ", event);
  };
  const createPath = async (path) => {
    await window.CefSharp.BindObjectAsync("FileSystemClass");
    await window.FileSystemClass.createSha256(path);
  };
  worker.addEventListener("message", async (event) => {
    let directoryHandle = await get("directory");

    console.log("dirhandlerlenght", directoryHandle);
    debugger;
    let { fileHash, filedata } = event.data;
    let sliceHash = fileHash.slice(0, 7);
    if (navigator.userAgentData.brands.length === 1) {
      await createPath(sliceHash);
    }
    let fileHashArray = sliceHash.split("");

    console.log("fileHashArray", fileHashArray);

    for (let i = 0; i < fileHashArray.length; i++) {
      const element = fileHashArray[i];

      const newDirectoryHandle = await directoryHandle.getDirectoryHandle(
        element,
        {
          create: navigator.userAgentData.brands.length === 1 ? false : true,
        }
      );

      directoryHandle = newDirectoryHandle;
      console.log("new dir", newDirectoryHandle);
    }
    let { name, file } = filedata;

    const newFileHandle = await directoryHandle.getFileHandle(
      `${fileHash}_${name}`,
      {
        create: true,
      }
    );
    const writableStream = await newFileHandle.createWritable();
    // write our file
    await writableStream.write(file);
    // close the file and write the contents to disk.
    await writableStream.close();
    console.log("new File handler", newFileHandle);
    // saveData(file, filename);
  });

  const handelFileHash = async (element) => {
    // setDirHanlder((dirRecHandler) => [...dirRecHandler, newDirectoryHandle]);
  };
  let handleReceiveMessage = async (e) => {
    worker.postMessage(e.data);

    // if (typeof e.data === "string") {
    //   // Once, all the chunks are received, combine them to form a Blob
    //   const file = new Blob(fileChunks);
    //   fileReceived.push(file);
    //   console.log("file recevied", file);
    // saveData(file, e.data);
    //   console.log(fileReceived);

    //   fileChunks = [];
    //   // // file.download()
    //   // URL.createObjectURL(file).download();
    // } else {
    //   // Keep appending various file chunks
    //   fileChunks.push(e.data);
    // }

    // setMessage((messages) => [...messages, { yours: false, value: e.data }]);
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
  var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (blob, fileName) {
      // var json = JSON.stringify(data),
      //   blob = new Blob([json], { type: "octet/stream" }),
      let url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    };
  })();
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  let createAnswer = () => {
    console.log("Answer");
    pc.current.createAnswer({ offerToReceiveVideo: 1 }).then((sdp) => {
      console.log(JSON.stringify(sdp));
      // set answer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
      console.log("received channel", pc.current);

      pc.current.ondatachannel = async (e) => {
        let receivedChannel = e.channel;
        let dbDir = await get("directory");
        if (dirRecHandler.length === 0 && dbDir === undefined) {
          let dir = await window.showDirectoryPicker({
            mode: "readwrite",
            startIn: "documents",
          });
          let subdir = await dir.getDirectory("1", { create: true });
          console.log("subsir", subdir);
          setRecDirHanlder((dirRecHandler) => [...dirRecHandler, dir]);
          await set("directory", dir);
          console.log("localDirHandler", dir);
        }
        setRecDirHanlder((dirRecHandler) => [...dirRecHandler, dbDir]);
        receivedChannel.onmessage = handleReceiveMessage;

        receivedChannel.onopen = handleReceivedChannelStatusChange;

        sandChannel.current = receivedChannel;
      };
    });
  };

  const handleReceivedChannelStatusChange = async (e) => {
    // if (e.type === "open") {
    //   let localDirHandler = await window.showDirectoryPicker();
    //   setRecDirHanlder((dirRecHandler) => [...dirRecHandler, localDirHandler]);
    //   await set("directory", localDirHandler);
    //   console.log("localDirHandler", localDirHandler);
    // }
  };
  // let setRemoteDescription = () => {
  //   // retrieve and parse the SDP copied from the remote peer
  //   const desc = JSON.parse(textref.value);

  //   // set sdp as remote description
  //   pc.current.setRemoteDescription(new RTCSessionDescription(desc));
  // };

  // let addCandidate = () => {
  //   // retrieve and parse the Candidate copied from the remote peer
  //   // const candidate = JSON.parse(textref.value)
  //   // console.log('Adding candidate:', candidate)

  //   // add the candidate to the peer connection
  //   // pc.addIceCandidate(new RTCIceCandidate(candidate))

  //   candidates.forEach((candidate) => {
  //     // console.log(JSON.stringify(candidate));
  //     pc.current.addIceCandidate(new RTCIceCandidate(candidate));
  //   });
  // };
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
        // setDirHanlder((dirHandler) => [
        //   ...dirHandler,
        //   {
        //     id: entry,
        //     name: entry.name,
        //     kind: entry.kind,
        //   },
        // ]);

        let file = await entry.getFile();
        setFiles((files) => [...files, file]);
        console.log("files", file);
      }
      setDirHanlder((dirHandler) => [...dirHandler, localDirHandler]);
    }
  };
  const handleGetPermission = async () => {
    let dir = await get("directory");
    await verifyPermission(dir, "readwrite");
  };

  return (
    <div>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={localVideoref}
        autoPlay
      ></video>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoref}
        autoPlay
      ></video>
      <br />

      <button onClick={createOffer}>Offer</button>
      <button onClick={OfferAgain}> Offer Again</button>
      <button onClick={createAnswer}>Answer</button>

      <br />
      <textarea
        style={{ width: 450, height: 40 }}
        ref={(ref) => {
          textref = ref;
        }}
      />
      {/* <div
        style={{ width: "500px", height: "500px", border: "1px solid gray" }}
      >
        {messages.length
          ? messages.map((item) => {
              return (
                <div>
                  <p>{item.yours}</p>
                  <p>{item.value}</p>
                </div>
              );
            })
          : "Null"}
      </div>
      <input onChange={(e) => setText(e.target.value)} value={text} />
      <button onClick={sendMessage}>Send</button> */}
      {/* <input multiple type="file" onChange={handleOnChangeSendFile} /> */}
      <button onClick={handleDirectoryHnadler}>Select Files Path</button>
      <button onClick={handleSendFiles}>Send Files</button>
      <button onClick={handleGetPermission}>Get Permission</button>
      <p>{files.length}</p>
      <p>{dirRecHandler.length}</p>

      {/* <br />
        <button onClick={setRemoteDescription}>Set Remote Desc</button>
        <button onClick={addCandidate}>Add Candidate</button> */}
    </div>
  );
};

export default App;
