const express = require('express');
const fileUpload = require('express-fileupload');
const ws = require('ws');
const fs = require('fs');
const crypto = require('crypto');

class HoloCaptureServer {
  constructor() {
    let app = express();

    this.activesessions = {};
    this.activeconnections = [];

    //app.use(express.urlencoded());
    app.use(fileUpload());
    app.use(express.static('./static/'));

    const expressServer = app.listen(8080, () => {
      console.log('express server listening');
      let websocketServer = new ws.WebSocketServer({
        noServer: true,
        path: '/',
      });
      websocketServer.on('connection', ws => this.handleConnection(ws));
      expressServer.on('upgrade', (request, socket, head) => {
        websocketServer.handleUpgrade(request, socket, head, websocket => {
          websocketServer.emit("connection", websocket, request);
        });
      });
    });

    app.put('/', (req, res) => {
      let sessionid = req.body.sessionid,
          snapid = req.body.snapid;

      let fnames = Object.keys(req.files);
      if (fnames.length == 1) {
        let file = req.files[fnames[0]],
            path = `./sessions/${sessionid}/snaps/${snapid}/`;

        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        file.mv(path + file.name);
        res.send({success: true});
      } else {
        res.send({success: false});
      }
    });

  }
  getSessionList() {
    let sessions = {};
    let keys = Object.keys(this.activesessions).reverse();
    keys.forEach(k => {
      let summary = this.activesessions[k].summarize();
      if (summary.active) {
        sessions[k] = summary;
      }
    });
    return sessions;
  }
  sendSessionList(ws) {
    ws.send(JSON.stringify({type: 'session_list', sessions: this.getSessionList()}));
  }
  sendSessionListToAll() {
    this.cleanupOldSessions();
    let msg = JSON.stringify({type: 'session_list', sessions: this.getSessionList()});
    this.activeconnections.forEach(ws => ws.send(msg));
  }
  cleanupOldSessions() {
    let now = Date.now();
    for (let k in this.activesessions) {
      let sess = this.activesessions[k];
      if (sess.active && sess.connections.length == 0 && now - sess.createtime > 1000 * 60 * 10) {
        sess.active = false;
      }
    }
  }
  handleConnection(ws) {
    console.log('got connection');
    this.activeconnections.push(ws);
    this.sendSessionList(ws);
    ws.on('close', ev => {
      this.handleClose(ws, ev);
    });
    ws.on('message', ev => {
      this.handleMessage(ws, ev);
    });
  }
  handleMessage(ws, buffer) {
    try {
      let msg = JSON.parse(buffer.toString());
      if (msg.type == 'session_create') {
        for (let k in this.activesessions) {
          this.activesessions[k].removeConnection(ws);
        }
        let session = new HoloCaptureSession(msg, ws);
        this.activesessions[session.sessionid] = session;
        ws.send(JSON.stringify({type: 'session_joined', session: session.summarize()}));
        this.sendSessionListToAll();
        session.save();
      } else if (msg.type == 'session_join') {
        let session = this.activesessions[msg.sessionid];
        if (!session) {
          session = HoloCaptureSession.loadById(msg.sessionid, ws);
        }
        if (session) {
          this.activesessions[session.sessionid] = session;
          //console.log('join user to session', session);
          for (let k in this.activesessions) {
            this.activesessions[k].removeConnection(ws);
          }
          session.addConnection(ws);
          session.active = true;
          ws.send(JSON.stringify({type: 'session_joined', session: session.summarize()}));
          this.sendSessionListToAll();
        }
      } else if (msg.type == 'session_snap') {
        let session = this.activesessions[msg.sessionid];
        if (session) {
          session.sendAll({type: 'session_snap', sessionid: msg.sessionid, snapid: msg.snapid});
        } else {
          console.log('Attempted snap for unknown session id', msg.sessionid);
        }
      }
    } catch (e) {
      console.log('Invalid message from client:', buffer.toString(), e);
    }
  }
  handleClose(ws, ev) {
console.log('close', ev);
    for (let k in this.activesessions) {
      this.activesessions[k].removeConnection(ws);
    }
    let idx = this.activeconnections.indexOf(ws);
    if (idx != -1) {
      this.activeconnections.splice(idx, 1);
    }
    this.sendSessionListToAll();
  }
}

class HoloCaptureSession {
  constructor(sessiondata={}, owner) {
    this.active = true;
    this.sessionid = sessiondata.sessionid || crypto.randomUUID();
    this.sessionname = sessiondata.sessionname || '';
    this.createtime = sessiondata.createtime || Date.now();
    this.connections = [owner];
    console.log('new session', this.sessionid, this.sessionname);
  }
  async load(sessionid) {
    this.sessionid = sessionid;
    let path = `./sessions/${sessionid}/`;
    if (fs.existsSync(path)) {
      let json = await fs.readFile(path + 'session.json');
    }
  }
  async save() {
    let path = `./sessions/${this.sessionid}/`;
    console.log('save session', path, this.sessionid);
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    fs.writeFileSync(path + 'session.json', JSON.stringify(this.summarize()));
  }
  addConnection(ws) {
    if (this.connections.indexOf(ws) == -1) {
      this.connections.push(ws);
      this.sendAll({type: 'session_update', session: this.summarize()});
    }
  }
  removeConnection(ws) {
    let idx = this.connections.indexOf(ws);
    if (idx != -1) {
      this.connections.splice(idx, 1);
      this.sendAll({type: 'session_update', session: this.summarize()});
      return true;
    }
    return false;
  }
  sendAll(data) {
    for (let i = 0; i < this.connections.length; i++) {
      this.connections[i].send(JSON.stringify(data));
    }
  }
  summarize() {
    return {
      active: this.active,
      sessionid: this.sessionid,
      sessionname: this.sessionname,
      createtime: this.createtime,
      relativetime: this.formatRelativeTime(this.createtime),
      connectioncount: this.connections.length,
    };
  }
  formatRelativeTime(time) {
    let now = Date.now(),
        diff = (now - time) / 1000;

    if (diff < 60) {
      return 'just now';
    } else if (diff < 3600) {
      let val = Math.floor(diff / 60); 
      return val + ' min' + (val == 1 ? '' : 's') + ' ago';
    } else if (diff < 86400) {
      let val = Math.floor(diff / 3660);
      return val + ' hour' + (val == 1 ? '' : 's') + ' ago';
    } else {
      let val = Math.floor(diff / 86400);
      return val + ' day' + (val == 1 ? '' : 's') + ' ago';
    }
  }
}

HoloCaptureSession.loadById = function(sessionid, ws) {
  console.log('load holocap session by id', sessionid);
  let path = `./sessions/${sessionid}/`;
  if (fs.existsSync(path)) {
    let json = fs.readFileSync(path + 'session.json');
    if (json) {
      let data = JSON.parse(json);
      let session = new HoloCaptureSession(data, ws);
      session.active = true;
      return session;
    }
  }
  return undefined;
}

new HoloCaptureServer();

