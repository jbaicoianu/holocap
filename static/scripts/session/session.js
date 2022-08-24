export class HolocapSession extends HTMLElement {
  set sessionid(v) { this.setAttribute('sessionid', v); };
  get sessionid() { return this.getAttribute('sessionid'); };

  set active(v) { if (v) { this.setAttribute('active', true); } else { this.removeAttribute('active'); } };
  get active() { return !!this.getAttribute('active'); };

  set sessionname(v) { this.setAttribute('sessionname', v); };
  get sessionname() { return this.getAttribute('sessionname'); };

  set createtime(v) { this.setAttribute('createtime', v); };
  get createtime() { return this.getAttribute('createtime'); };

  constructor() {
    super();
  }
  connectedCallback() {
    this.addEventListener('click', ev => this.handleClick(ev));
    this.parentNode.addEventListener('session_join', ev => {
      this.active = false;
    });

  }
  set(data) {
    this.sessionid = data.sessionid;
    this.sessionname = data.sessionname;
    this.connectioncount = data.connectioncount;
    this.createtime = data.createtime;
    this.relativetime = data.relativetime;
    this.innerHTML = `
      <h2>${this.sessionname}</h2>
      <h3>(${this.sessionid})</h3>
      <p>${this.connectioncount} participants</p>
      <p>Created ${this.relativetime}</p>
    `;

    this.qrcode = document.createElement('div');
    this.qrcode.className = 'qrcode';
    this.appendChild(this.qrcode);
    this.qr = new QRCode(this.qrcode, {
      text: document.location.origin + document.location.pathname + '#' + this.sessionid,
      width: 256,
      height: 256,
      colorDark: '#000',
      colorLight: '#fff',
      correctLevel: QRCode.CorrectLevel.H,
    });
  }
  handleClick(ev) {
    this.dispatchEvent(new CustomEvent('session_join', {bubbles: true}));
    this.active = true;
  }
}

customElements.define('holocap-session', HolocapSession);
