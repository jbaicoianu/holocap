import { HolocapSession } from './session.js';

export class HolocapSessionList extends HTMLElement {
  connectedCallback() {
    this.setSessions();
  }
  setSessions(sessions, activesession) {
    this.sessions = [];
console.log('set sessions', sessions);
    if (sessions) {
      this.innerText = '';
      for (let k in sessions) {
        let session = document.createElement('holocap-session');
        session.set(sessions[k]);
        this.appendChild(session);
        if (k == activesession) session.active = true;
        this.sessions[k] = session;
      }
    }
    if (this.childNodes.length == 0) {
      //this.innerText = 'No active photo sessions';
      let el = document.createElement('strong');
      el.innerText = 'No active photo sessions';
      this.appendChild(el);
    }
    //this.appendChild(this.button);
  }
  updateSession(session) {
    if (this.sessions[session.sessionid]) {
      this.sessions[session.sessionid].set(session);
    }
  }
}

customElements.define('holocap-session-list', HolocapSessionList);
