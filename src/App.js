import React, { useEffect, useRef, useState } from "react";

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
  let ENDPOINT = "https://webrtc-react.herokuapp.com/";

  const worker = new Worker("../worker.js");
  const send_worker = new Worker("../send_worker.js");

  socket = io.connect(ENDPOINT, {
    path: "/webrtc",
    rejectUnauthorized: false,
  });
  // let [chunkState, setChunkState] = useState(false);
  // let [buffer, setBuffer] = useState("");
  useEffect(() => {
    socket.on("connection-success", (success) => {
      console.log(success);
    });

    socket.on("offerOrAnswer", (sdp) => {
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
      console.log("Offer", sdp);
      localStorage.setItem("sdp", JSON.stringify(sdp));

      // set offer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
    });
  };
  const handleSendChannelStatusChange = (event) => {
    console.log("send channel status: ", event);
  };
  worker.addEventListener("message", (event) => {
    let { file, filename } = event.data;
    saveData(file, filename);
  });
  let handleReceiveMessage = (e) => {
    // console.log("file chunk received", e);
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
      // console.log(JSON.stringify(sdp))
      // set answer sdp as local description
      pc.current.setLocalDescription(sdp);

      sendToPeer("offerOrAnswer", sdp);
      console.log("received channel", pc.current);

      pc.current.ondatachannel = (e) => {
        let receivedChannel = e.channel;
        receivedChannel.onmessage = handleReceiveMessage;
        receivedChannel.onopen = handleSendChannelStatusChange;

        sandChannel.current = receivedChannel;
      };
    });
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
      const chunkSize = 16 * 1024;
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
      <input multiple type="file" onChange={handleOnChangeSendFile} />
      <button onClick={handleSendFiles}>Send Files</button>
      {/* <br />
        <button onClick={setRemoteDescription}>Set Remote Desc</button>
        <button onClick={addCandidate}>Add Candidate</button> */}
    </div>
  );
};

export default App;
