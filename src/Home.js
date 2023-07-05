import { useEffect, useState } from "react";
import {
  get,
  set,
  keys,
  createStore,
} from "https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js";
const Home = (props) => {
  let { channel } = props;
  let [state, setState] = useState({
    isDirPermited: false,
    connStatus: "",
    channelStatus: "",
    offerVisible: true,
    files: [],
    filesName: [],
    checked: [],
  });
  let [filesName, setFilesName] = useState([]);
  let [files, setFiles] = useState([]);
  let [checked, setChecked] = useState([]);
  let [store, setStore] = useState("");
  useEffect(() => {
    let fillDbStore = createStore("FileDirectoryHandlers", "FileDirHandlers");
    keys(fillDbStore).then((dbFilesName) => {
      // console.log("entries", dbFilesName);
      setFilesName(dbFilesName);
      // setState({ ...state, filesName: [...state.filesName, dbFilesName] });
    });
    channel.onmessage = (e) => {
      debugger;
      switch (e.data.type) {
        case "status":
          setState({
            ...state,
            connStatus: e.data.data.connStatus,
            channelStatus: e.data.data.channelStatus,
          });
          break;
        case "receviedOffer":
          setState({
            ...state,
            offerVisible: e.data.data.offerVisible,
            offerStatus: e.data.data.offerStatus,
          });
          break;
        case "reload":
          window.location.reload(true);
          break;
        default:
          break;
      }
    };
  }, []);

  const sendMessage = ({ type, data }) => {
    channel.postMessage(
      {
        type: type,
        data: data,
      },
      "/webrtc"
    );
  };

  const handleGetPermission = async () => {
    let dbStore = createStore("Directory", "DirHanlders");

    let dir = await get("directory", dbStore);
    if (dir === undefined) {
      let newdir = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      await set("directory", newdir, dbStore);
      // setState({ ...state, store: newdir });
      setStore(newdir);
    }

    await verifyPermission(dir, "readwrite");
    setState({ ...state, isDirPermited: true });
    setStore(dir);
  };

  const handleNewTab = (type) => {
    if (type === "close") {
      state.tab.close();
      setState({ ...state, isTabOpen: false });
    }
    if (type === "open") {
      let tab = window.open("/webrtc", "_blank");
      setState({ ...state, tab, isTabOpen: true });
    }
  };
  const handleOffer = () => {
    sendMessage({
      type: "offer",
    });
    setState({
      ...state,
      offerStatus: "Calling...",
      connStatus: "connecting...",
      channelStatus: "opening...",
    });
  };
  const handleAnswer = () => {
    sendMessage({
      type: "answer",
    });
  };

  const handleOnChange = (e, name) => {
    if (e.target.checked) {
      setChecked([...checked, name]);
      // setState({ ...state, checked: [...state.checked, name] });
      // getFilsFromDb([...checked, name]);
    } else {
      setChecked(checked.filter((item) => item !== name));
      // setState({
      //   ...state,
      //   checked: state.checked.filter((item) => item !== name),
      // });
    }
  };

  const handleCheckAllChange = (e) => {
    if (e.target.checked) {
      // const allCountries = filesName.map((c) => c);
      setChecked(filesName);
      debugger;
      // setState({ ...state, checked: state.filesName });
      // getFilsFromDb(filesName);
      // sendMessage({
      //   type: "getFilsFromDb",
      //   data: { data: filesName, store: store },
      // });
    } else {
      setChecked([]);
      // setState({ ...state, checked: [] });
    }
  };

  const handleDirectoryHnadler = async () => {
    setFiles([]);
    // setState({ ...state, files: [] });
    let dbStore = createStore("Directory", "DirHanlders");
    let localDirHandler = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    for await (const entry of localDirHandler.values()) {
      if (entry.kind !== "directory") {
        let file = await entry.getFile();
        setFiles((files) => [...files, file]);
        // setState({ ...state, files: [...state.files, file] });
        // console.log("files", file);
      }
    }
    setState({ ...state, isDirPermited: true });
    await set("directory", localDirHandler, dbStore);
  };

  const handleSendFiles = () => {
    // sendMessage({type: "sendFiles"})
    sendMessage({
      type: "getFilsFromDb",
      data: { data: checked, store: store },
    });
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

  return (
    <>
      {console.log(state)}
      <h1>Home</h1>
      {state.connStatus === "connected" && state.channelStatus === "open" ? (
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
          {!state.isDirPermited ? (
            <button onClick={handleGetPermission}>Get Permission</button>
          ) : null}
          {state.isTabOpen ? (
            <button
              onClick={() => {
                handleNewTab("close");
              }}
            >
              Close Tab
            </button>
          ) : (
            <button
              onClick={() => {
                handleNewTab("open");
              }}
            >
              Open Tab
            </button>
          )}
          {state.offerVisible ? (
            <button
              disabled={state.isDirPermited ? false : true}
              onClick={handleOffer}
            >
              Offer
            </button>
          ) : (
            <button
              disabled={state.isDirPermited ? false : true}
              onClick={handleAnswer}
            >
              Answer
            </button>
          )}
        </div>
      )}
      <p>{state.offerStatus}</p>
      <p>{state.connStatus}</p>
      <p>{state.channelStatus}</p>
    </>
  );
};

export default Home;
