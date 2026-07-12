export class RecoilSystem {
  value=0;
  kick(amount:number):void{this.value=Math.min(1.5,this.value+amount);}
  update(delta:number):number{this.value=Math.max(0,this.value-delta*5.5);return this.value;}
}
