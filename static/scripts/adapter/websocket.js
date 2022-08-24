import { HolocapAdapter } from './adapter.js';

export class HolocapAdapterWebSocket extends HolocapAdapter {
  constructor(path) {
    super();
    let ws = new WebSocket(path);
    ws.addEventListener('open', ev => this.handleServerConnect(ev));
    ws.addEventListener('message', ev => this.handleServerMessage(ev));
    ws.addEventListener('close', ev => this.handleServerClose(ev));
    this.ws = ws;
  }
  createSession(sessionname) {
    this.ws.send(JSON.stringify({type: 'session_create', sessionname: sessionname}));
  }
  joinSession(sessionid) {
    this.ws.send(JSON.stringify({type: 'session_join', sessionid: sessionid}));
  }
  snap(sessionid, snapid) {
    this.ws.send(JSON.stringify({type: 'session_snap', sessionid: sessionid, snapid: snapid}));
  }
  async upload(sessionid, snapid, file) {
    let path = document.location.origin + document.location.pathname;

    let formdata = new FormData();
    formdata.append('sessionid', sessionid);
    formdata.append('snapid', snapid);
    formdata.append('image', file);
    //let res = await fetch(path, { method: 'put', body: JSON.stringify(formdata), headers: {'Content-Type': 'application/json',} });
    let res = await fetch(path, { method: 'put', body: formdata });
    let json = await res.json();
    console.log('uploaded file', json);
  }

  handleServerConnect(ev) {
    this.dispatchEvent(new CustomEvent('connect'));
  }
  handleServerClose(ev) {
    this.dispatchEvent(new CustomEvent('disconnect'));
  }
  handleServerMessage(ev) {
    let data = JSON.parse(ev.data);
    if (data.type == 'session_list') {
      this.dispatchEvent(new CustomEvent('session_list', { detail: data }));
    } else if (data.type == 'session_snap') {
      this.dispatchEvent(new CustomEvent('session_snap', { detail: data }));
    } else if (data.type == 'session_update') {
      this.dispatchEvent(new CustomEvent('session_update', { detail: data }));
    } else if (data.type == 'session_joined') {
      this.dispatchEvent(new CustomEvent('session_joined', { detail: data }));
    }
  }
}

