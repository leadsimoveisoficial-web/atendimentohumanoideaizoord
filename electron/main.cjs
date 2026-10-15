const { app, BrowserWindow, session } = require("electron");
const URL = "https://zoord-showcase-render.lovable.app";
function create() {
  const win = new BrowserWindow({
    width: 1280, height: 800, fullscreenable: true, autoHideMenuBar: true,
    backgroundColor: "#0b1020", icon: __dirname + "/../public/icons/icon-512.png",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  // Permite câmera e microfone para a conversa ao vivo com o Zoord
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) =>
    cb(["media", "microphone", "camera", "fullscreen"].includes(perm)));
  win.loadURL(URL);
}
app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());
