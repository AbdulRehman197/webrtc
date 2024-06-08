import { io } from 'socket.io-client';

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? 'https://honored-glittery-bar.glitch.me' : 'https://honored-glittery-bar.glitch.me';

export const socket = io(URL,{
    path: "/webrtc",
});