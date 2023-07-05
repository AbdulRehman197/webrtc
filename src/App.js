import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./Home";
import Webrtc from "./webrtc";

export default function App() {
  let webrtcChannel = new BroadcastChannel("webrtc");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home channel={webrtcChannel} />} />
        <Route path="/webrtc" element={<Webrtc channel={webrtcChannel} />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
