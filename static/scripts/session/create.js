import { SimplePrompt } from '../simpleprompt.js';

export class HolocapSessionCreate extends HTMLElement {
  connectedCallback() {
    let button = document.createElement('button');
    button.innerText = 'Create New';
    button.addEventListener('click', ev => this.createSession());
    this.appendChild(button);
    this.button = button;
  }
  async createSession() {
    let nameprompt = document.createElement('simple-prompt');
    this.appendChild(nameprompt);
    let sessionname = await nameprompt.prompt('session name');
    this.removeChild(nameprompt);
    console.log('wow cool ok', sessionname);
    this.dispatchEvent(new CustomEvent('session_create', { detail: sessionname }));
  }
}

customElements.define('holocap-session-create', HolocapSessionCreate);
