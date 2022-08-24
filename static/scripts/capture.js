import { HolocapAdapterWebSocket } from './adapter/websocket.js';
import { HolocapSessionList } from './session/list.js';
import { HolocapSessionCreate } from './session/create.js';

// Based on the "collaborative hologram" concept here
// https://lisbethkaufman.medium.com/the-collaborative-hologram-turn-your-wedding-guests-into-artists-53e6ac44a215

export class HolocapCapture extends HTMLElement {
  constructor() {
    super();
    // - connect to some synchronization backend via an adapter
    // - find or create a hologram capture session
    // - wait for participants to join
    // - when snapshot creator hits "capture" all participants get 3 second countdown
    // - after 3 second countdown, each phone snaps a picture, hopefully in sync
    // - as soon as the picture has been taken, picture is stored in offline storage
    // - client attempts to upload picture to server, associated with sessionid, until successful
    // - at a later date, we can run each collection of photos through photogrammetry, NeRF, or other processes
    this.connect();
  }
  connectedCallback() {
    let nav = document.createElement('nav');

    let sessionlist = document.createElement('holocap-session-list');
    sessionlist.addEventListener('session_join', ev => this.joinSession(ev.target.sessionid));
    nav.appendChild(sessionlist);

    let sessioncreate = document.createElement('holocap-session-create');
    sessioncreate.addEventListener('session_create', ev => this.createSession(ev.detail));
    nav.appendChild(sessioncreate);

    this.appendChild(nav);

    this.nav = nav;
    this.sessionlist = sessionlist;

    //this.startCamera();
  }
  async connect() {
    this.adapter = new HolocapAdapterWebSocket('wss://holo.lnq.to');
    this.adapter.addEventListener('connect', ev => this.handleAdapterConnect());
    this.adapter.addEventListener('disconnect', ev => this.handleAdapterDisconnect());
    this.adapter.addEventListener('session_list', ev => this.handleAdapterSessionList(ev.detail));
    this.adapter.addEventListener('session_snap', ev => this.handleAdapterSessionSnap(ev.detail));
    this.adapter.addEventListener('session_update', ev => this.handleAdapterSessionUpdate(ev.detail));
    this.adapter.addEventListener('session_joined', ev => this.handleAdapterSessionJoined(ev.detail));
  }
  async listSessions() {
  }
  async createSession(sessionname) {
    console.log('create session', sessionname);
    this.adapter.createSession(sessionname);
  }
  async joinSession(sessionid) {
    console.log('join session', sessionid);
    this.adapter.joinSession(sessionid);
  }
  setActiveSession(sessionid) {
    this.activesession = sessionid;
    if (!this.video) {
      this.startCamera();
    }
    document.location.hash = sessionid;
  }
  async startCamera() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({video: {
        facingMode: 'environment',
        width: { ideal: 4096 },
        height: { ideal: 2160 },
      }});
      console.log('got video stream', stream);
      let video = document.createElement('video');
      video.srcObject = stream;
      this.appendChild(video);
      video.play();

      let button = document.createElement('button');
      button.id = 'snap';
      button.innerText = 'Snap';
      //button.addEventListener('click', ev => this.takePicture());
      button.addEventListener('click', ev => this.sendSnapRequest());
      this.appendChild(button);
      
      this.video = video;
      this.stream = stream;
      this.button = button;

    } catch (e) {
      console.error(e);
    }
  }
  sendSnapRequest() {
    this.adapter.snap(this.activesession, crypto.randomUUID());
  }
  takePicture(sessionid, snapid) {
    let canvas = document.createElement('canvas'),
        video = this.video;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //this.appendChild(canvas);

    this.classList.add('flash');
    setTimeout(() => {
      this.classList.remove('flash');
    }, 1000);

    // store picture in offline storage, then attempt upload
    this.uploadPicture(sessionid, snapid, canvas);
  }
  async uploadPicture(sessionid, snapid, canvas) {
    let imageres = await fetch(canvas.toDataURL());
    let imagedata = await imageres.arrayBuffer();
    let file = new File([imagedata], crypto.randomUUID() + '.png', { type: 'image/png' });

    this.adapter.upload(sessionid, snapid, file);
  }
  handleAdapterConnect(ev) {
    console.log('connected to server via adapter', this.adapter, ev);
    if (document.location.hash) {
      this.joinSession(document.location.hash.substr(1));
    }
  }
  handleAdapterDisconnect(ev) {
    // FIXME - should reconnect logic be in the adapter?
    console.log('Adapter disconnected, reconnecting...', this.adapter, ev);
    setTimeout(() => {
      this.connect();
    }, 5000);
  }
  handleAdapterSessionList(data) {
    this.sessionlist.setSessions(data.sessions, this.activesession);
  }
  handleAdapterSessionSnap(data) {
    this.takePicture(data.sessionid, data.snapid);
  }
  handleAdapterSessionUpdate(data) {
    this.sessionlist.updateSession(data.session);
  }
  handleAdapterSessionJoined(data) {
    this.setActiveSession(data.session.sessionid);
  }
}

customElements.define('holocap-capture', HolocapCapture);
