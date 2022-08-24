export class SimplePrompt extends HTMLElement {
  connectedCallback() {
  }
  prompt(labeltext) {
    return new Promise((accept, reject) => {
      this.innerHTML = '';
/*
      let label = document.createElement('label');
      label.innerText = labeltext;
      this.appendChild(label);
*/

      let input = document.createElement('input');
      input.placeholder = labeltext;
      this.appendChild(input);
      input.addEventListener('change', ev => {
        accept(input.value);
      });
      input.focus();
    });
  }
}

customElements.define('simple-prompt', SimplePrompt);
