import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld';
import { EnvironmentFactory } from './EnvironmentFactory';
import { LowPolyMaterialFactory, PALETTE } from '../visuals/LowPolyMaterialFactory';

export interface MapSystems {
  generator: any; turretPivot: any; fenceSegments: any[]; healingStation: any;
  ammoStation: any; scannerLights: any[]; safePosition: any;
}

export class OutpostMap {
  readonly group = new THREE.Group();
  readonly collision = new CollisionWorld();
  readonly systems: MapSystems;

  constructor(private readonly materials: LowPolyMaterialFactory) {
    const factory = new EnvironmentFactory(materials);
    this.group.name = 'OutpostMap';

    const ground = new THREE.Mesh(new THREE.CircleGeometry(44, 24), materials.material(PALETTE.sand));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.group.add(ground);
    const courtyard = new THREE.Mesh(new THREE.CircleGeometry(19, 16), materials.material(PALETTE.concreteDark));
    courtyard.rotation.x = -Math.PI / 2; courtyard.position.y = 0.02; courtyard.receiveShadow = true; this.group.add(courtyard);

    this.addBuilding(factory, -12, -7, 8, 6, 4.5);
    this.addBuilding(factory, 12, -6, 8, 6, 4.5);
    this.addContainer(factory, -13, 11, 6, 2.8);
    this.addContainer(factory, 13, 12, 6, 2.8);

    for (const [x, z, r] of [[-34,-20,2.7],[34,-15,3],[33,20,2.4],[-34,19,3.2],[-18,34,2.2],[20,35,3]] as number[][]) this.group.add(factory.rock(x!, z!, r!));
    for (const [x, z] of [[-6,13],[6,14],[-18,2],[19,3],[-8,-16],[9,-17]] as number[][]) { this.group.add(factory.crate(x!, z!)); this.collision.addBox(x!, z!, 1.8, 1.8, 1.8); }
    for (const [x,z,w,d] of [[-7,6,5,1],[7,6,5,1],[-7,-1,4,1],[7,-1,4,1],[-20,-10,5,1],[20,-10,5,1]] as number[][]) {
      this.group.add(factory.box(w!, 1.2, d!, PALETTE.concrete, x!, 0.6, z!)); this.collision.addBox(x!, z!, w!, d!, 1.2);
    }

    const generator = this.createGenerator(); generator.position.set(0, 0, 2); this.group.add(generator); this.collision.addBox(0, 2, 4.2, 3.6, 2.5);
    const turretPivot = this.createTurret(); turretPivot.position.set(0, 2.4, -10); this.group.add(turretPivot);
    const healingStation = this.createStation('H', PALETTE.green); healingStation.position.set(-9, 0, -2); this.group.add(healingStation); this.collision.addBox(-9, -2, 1.8, 1.8, 2.5);
    const ammoStation = this.createStation('A', PALETTE.orange); ammoStation.position.set(9, 0, -2); this.group.add(ammoStation); this.collision.addBox(9, -2, 1.8, 1.8, 2.5);
    const scannerLights = [this.createFloodlight(-16, -15), this.createFloodlight(16, -15), this.createFloodlight(-16, 16), this.createFloodlight(16, 16)];
    scannerLights.forEach((light) => this.group.add(light));
    const fenceSegments = this.createFence(); fenceSegments.forEach((segment) => this.group.add(segment));
    this.group.add(factory.antenna(-12, -7));
    this.createWatchtower(factory);

    this.systems = { generator, turretPivot, fenceSegments, healingStation, ammoStation, scannerLights, safePosition: new THREE.Vector3(0, 1.7, -2) };
  }

  private addBuilding(factory: EnvironmentFactory, x: number, z: number, w: number, d: number, h: number): void {
    const building = factory.box(w, h, d, PALETTE.concrete, x, h / 2, z); this.group.add(building); this.collision.addBox(x, z, w, d, h);
    const roof = factory.box(w + 0.5, 0.35, d + 0.5, PALETTE.metalDark, x, h + 0.18, z); this.group.add(roof);
    const door = factory.box(1.6, 2.8, 0.15, PALETTE.metalDark, x, 1.4, z + d / 2 + 0.08); this.group.add(door);
    const light = new THREE.PointLight(PALETTE.cyan, 1.2, 8, 2); light.position.set(x, 3.3, z + d / 2 + 0.7); this.group.add(light);
  }

  private addContainer(factory: EnvironmentFactory, x: number, z: number, w: number, d: number): void {
    const box = factory.box(w, 2.8, d, PALETTE.metal, x, 1.4, z); this.group.add(box); this.collision.addBox(x, z, w, d, 2.8);
    for (let i = -2; i <= 2; i += 1) this.group.add(factory.box(0.08, 2.45, d + 0.05, PALETTE.metalDark, x + i * 1.05, 1.4, z, false));
  }

  private createGenerator(): any {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.25, 0.7, 8), this.materials.material(PALETTE.metalDark)); base.position.y = 0.35; group.add(base);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 2, 8), this.materials.material(PALETTE.metal)); core.position.y = 1.55; group.add(core);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.45, 8), this.materials.material(PALETTE.cyan, PALETTE.cyan, 2)); glow.position.y = 1.7; group.add(glow);
    const light = new THREE.PointLight(PALETTE.cyan, 2.4, 13, 2); light.position.y = 2; group.add(light); group.userData.glow = glow; group.userData.light = light; return group;
  }

  private createTurret(): any {
    const pivot = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 1, 8), this.materials.material(PALETTE.metalDark)); base.position.y = -1.9; pivot.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.7), this.materials.material(PALETTE.metal)); head.position.y = -0.4; pivot.add(head);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.8, 8), this.materials.material(PALETTE.black)); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, -0.25, -2); pivot.add(barrel);
    pivot.userData.barrel = barrel; return pivot;
  }

  private createStation(label: string, color: number): any {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 1.5), this.materials.material(PALETTE.metal)); body.position.y = 1.2; group.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.78), this.materials.material(color, color, 1.8)); screen.position.set(0, 1.55, 0.76); group.add(screen);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.3), this.materials.material(PALETTE.cream)); plate.position.set(0, 0.72, 0.8); group.add(plate); group.userData.label = label; group.userData.screen = screen; return group;
  }

  private createFloodlight(x: number, z: number): any {
    const group = new THREE.Group(); group.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5, 6), this.materials.material(PALETTE.metal)); pole.position.y = 2.5; group.add(pole);
    const lamp = new THREE.SpotLight(PALETTE.cream, 0, 28, Math.PI / 5, 0.6, 1.6); lamp.position.set(0, 5, 0); lamp.target.position.set(0, 0, 0); group.add(lamp, lamp.target); group.userData.light = lamp; return group;
  }

  private createFence(): any[] {
    const segments: any[] = [];
    const points = [[-22,-22,22,-22],[22,-22,22,22],[22,22,-22,22],[-22,22,-22,-22]];
    for (const [ax,az,bx,bz] of points) {
      const length = Math.hypot(bx!-ax!, bz!-az!); const group = new THREE.Group();
      const wire = new THREE.Mesh(new THREE.BoxGeometry(length, 1.5, 0.08), this.materials.material(PALETTE.metal)); wire.position.y = 1.2; group.add(wire);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, 0.13), this.materials.material(PALETTE.cyan, PALETTE.cyan, 2)); glow.position.y = 1.4; group.add(glow);
      group.position.set((ax!+bx!)/2,0,(az!+bz!)/2); group.rotation.y = Math.atan2(bz!-az!, bx!-ax!); group.userData.glow = glow; segments.push(group);
    }
    return segments;
  }

  private createWatchtower(factory: EnvironmentFactory): void {
    const group = new THREE.Group(); group.position.set(-19, -1, 7);
    for (const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]] as number[][]) group.add(factory.box(0.25, 6, 0.25, PALETTE.metalDark, x!, 3, z!));
    group.add(factory.box(3, 0.35, 3, PALETTE.metal, 0, 6, 0));
    group.add(factory.box(3.4, 0.25, 3.4, PALETTE.orange, 0, 7.8, 0));
    this.group.add(group); this.collision.addBox(-19, 7, 3, 3, 7);
  }
}
