export class GameLoop {
  private running=false;private frame=0;private previous=performance.now();private accumulator=0;private readonly fixed=1/60;
  constructor(private readonly update:(delta:number,now:number)=>void,private readonly render:(alpha:number)=>void){}
  start():void{if(this.running)return;this.running=true;this.previous=performance.now();this.frame=requestAnimationFrame(this.tick);}
  stop():void{this.running=false;cancelAnimationFrame(this.frame);}
  private tick=(time:number):void=>{if(!this.running)return;const frameDelta=Math.min(0.1,(time-this.previous)/1000);this.previous=time;this.accumulator+=frameDelta;while(this.accumulator>=this.fixed){this.update(this.fixed,time/1000);this.accumulator-=this.fixed;}this.render(this.accumulator/this.fixed);this.frame=requestAnimationFrame(this.tick);};
}
