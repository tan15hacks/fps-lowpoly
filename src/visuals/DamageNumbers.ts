export class DamageNumbers {
  private root = document.createElement('div');
  constructor() { this.root.className='damage-numbers'; document.body.appendChild(this.root); }
  show(value: number, critical: boolean, screenX: number, screenY: number): void {
    const item=document.createElement('span'); item.className=critical?'critical':''; item.textContent=String(Math.round(value)); item.style.left=`${screenX}px`; item.style.top=`${screenY}px`; this.root.appendChild(item); window.setTimeout(()=>item.remove(),650);
  }
  dispose(): void { this.root.remove(); }
}
