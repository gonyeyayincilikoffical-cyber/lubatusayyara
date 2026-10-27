import * as THREE from 'three';
import { OnlinePlayer, VehicleModelId, ChatMessage } from '../types';

export interface TrafficCarMesh {
  mesh: THREE.Group;
  x: number;
  z: number;
  rotY: number;
  speed: number;
  targetWaypoints: { x: number; z: number }[];
  currentWaypointIdx: number;
  color: string;
}

export interface MultiplayerPlayerMesh {
  id: string;
  name: string;
  carModel: VehicleModelId;
  group: THREE.Group;
  speedKmh: number;
  targetX: number;
  targetZ: number;
  targetRotY: number;
  statusText?: string;
  nameTagSprite?: THREE.Sprite;
}

export class TrafficAndMultiplayerSystem {
  public trafficCars: TrafficCarMesh[] = [];
  public multiplayerPlayers: MultiplayerPlayerMesh[] = [];
  public parentGroup: THREE.Group;

  // Waypoints for city traffic loops
  private trafficLoop = [
    { x: 4.5, z: -100 },
    { x: 4.5, z: 100 },
    { x: 20, z: 100 },
    { x: 65, z: 100 },
    { x: 65, z: -100 },
    { x: 20, z: -100 },
  ];

  private trafficLoop2 = [
    { x: -4.5, z: 100 },
    { x: -4.5, z: -100 },
    { x: -65, z: -100 },
    { x: -65, z: 100 },
  ];

  constructor(parent: THREE.Group) {
    this.parentGroup = parent;
    this.initTraffic();
    this.initMultiplayerPlayers();
  }

  private initTraffic() {
    const trafficColors = ['#e2e8f0', '#3b82f6', '#10b981', '#f59e0b', '#64748b', '#ef4444'];
    const carMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 });

    // Spawn 6 traffic cars on road loops
    for (let i = 0; i < 6; i++) {
      const loop = i % 2 === 0 ? this.trafficLoop : this.trafficLoop2;
      const startWp = (i * 2) % loop.length;
      const pt = loop[startWp];

      const carGroup = new THREE.Group();
      const color = trafficColors[i % trafficColors.length];
      const mat = carMat.clone();
      mat.color.set(color);

      // Body box
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.2), mat);
      body.position.y = 0.5;
      body.castShadow = true;
      carGroup.add(body);

      // Cabin
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.6, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 })
      );
      cabin.position.set(0, 1.05, -0.2);
      carGroup.add(cabin);

      // Headlights
      const hlGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
      const leftHl = new THREE.Mesh(hlGeo, hlMat);
      leftHl.position.set(-0.65, 0.5, 2.12);
      carGroup.add(leftHl);

      const rightHl = new THREE.Mesh(hlGeo, hlMat);
      rightHl.position.set(0.65, 0.5, 2.12);
      carGroup.add(rightHl);

      // Taillights
      const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
      const leftTl = new THREE.Mesh(hlGeo, tlMat);
      leftTl.position.set(-0.65, 0.55, -2.12);
      carGroup.add(leftTl);

      const rightTl = new THREE.Mesh(hlGeo, tlMat);
      rightTl.position.set(0.65, 0.55, -2.12);
      carGroup.add(rightTl);

      carGroup.position.set(pt.x, 0, pt.z);
      this.parentGroup.add(carGroup);

      this.trafficCars.push({
        mesh: carGroup,
        x: pt.x,
        z: pt.z,
        rotY: 0,
        speed: 8 + Math.random() * 4, // ~30-45 km/h
        targetWaypoints: loop,
        currentWaypointIdx: (startWp + 1) % loop.length,
        color,
      });
    }
  }

  private initMultiplayerPlayers() {
    // Initial online players in room
    const mockPlayers = [
      { id: 'p1', name: '🇹🇷 Burak_Drift', carModel: 'drift_e30' as VehicleModelId, color: '#e11d48', x: 30, z: -30, rotY: 0 },
      { id: 'p2', name: '⚡ SpeedDemon', carModel: 'hyper_nero' as VehicleModelId, color: '#06b6d4', x: -4.5, z: 45, rotY: Math.PI },
      { id: 'p3', name: '🔥 ApexRacer', carModel: 'muscle_v8' as VehicleModelId, color: '#f59e0b', x: -45, z: 4.5, rotY: Math.PI / 2 },
      { id: 'p4', name: '💎 VIP_Emre', carModel: 'luxury_suv' as VehicleModelId, color: '#1e293b', x: 22, z: 8, rotY: -Math.PI / 2 },
    ];

    mockPlayers.forEach((p) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);
      group.rotation.y = p.rotY;

      // Realistic stylized car body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color),
        roughness: 0.25,
        metalness: 0.8,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.65, 4.5), bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Cabin
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.65, 2.4),
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transmission: 0.7 })
      );
      cabin.position.set(0, 1.1, -0.2);
      group.add(cabin);

      // 3D Canvas NameTag Billboard
      const nameTagSprite = this.createNameTagSprite(p.name);
      nameTagSprite.position.set(0, 2.3, 0);
      group.add(nameTagSprite);

      this.parentGroup.add(group);

      this.multiplayerPlayers.push({
        id: p.id,
        name: p.name,
        carModel: p.carModel,
        group,
        speedKmh: 45,
        targetX: p.x,
        targetZ: p.z,
        targetRotY: p.rotY,
        statusText: 'Şehir Gezisi',
        nameTagSprite,
      });
    });
  }

  private createNameTagSprite(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Rounded pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(8, 8, 240, 48, 24);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.0, 0.75, 1);
    return sprite;
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    // 1. Update Traffic Cars along waypoints
    this.trafficCars.forEach((tc) => {
      const target = tc.targetWaypoints[tc.currentWaypointIdx];
      const dx = target.x - tc.x;
      const dz = target.z - tc.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4.0) {
        // Next waypoint
        tc.currentWaypointIdx = (tc.currentWaypointIdx + 1) % tc.targetWaypoints.length;
      } else {
        const targetRot = Math.atan2(dx, dz);
        tc.rotY += (targetRot - tc.rotY) * Math.min(1.0, dt * 3.5);

        // Move forward
        const moveDist = tc.speed * dt;
        tc.x += Math.sin(tc.rotY) * moveDist;
        tc.z += Math.cos(tc.rotY) * moveDist;

        tc.mesh.position.set(tc.x, 0, tc.z);
        tc.mesh.rotation.y = tc.rotY;
      }
    });

    // 2. Update Multiplayer Players (Autonomous simulated driving behaviors)
    this.multiplayerPlayers.forEach((mp, idx) => {
      // Move in lively patrol / drifting patterns around the city
      const time = performance.now() * 0.0008 + idx * 2.5;

      if (idx === 0) {
        // Drifting in parking plaza
        const r = 10;
        mp.targetX = 34 + Math.sin(time * 1.5) * r;
        mp.targetZ = -32 + Math.cos(time * 1.5) * r;
        mp.targetRotY = time * 1.5 + Math.PI / 2 + 0.3; // drift angle
        mp.speedKmh = 58;
      } else if (idx === 1) {
        // Cruising North-South boulevard
        const speed = 24;
        mp.targetX = -4.5;
        mp.targetZ = ((time * speed) % 200) - 100;
        mp.targetRotY = 0;
        mp.speedKmh = 85;
      } else if (idx === 2) {
        // Cruising East-West avenue
        const speed = 20;
        mp.targetX = ((time * speed) % 220) - 110;
        mp.targetZ = 4.5;
        mp.targetRotY = Math.PI / 2;
        mp.speedKmh = 72;
      } else {
        // Cruising outer ring
        const r = 55;
        mp.targetX = Math.cos(time * 0.6) * r;
        mp.targetZ = Math.sin(time * 0.6) * r;
        mp.targetRotY = -time * 0.6;
        mp.speedKmh = 48;
      }

      // Smooth lerp
      mp.group.position.x += (mp.targetX - mp.group.position.x) * Math.min(1.0, dt * 5);
      mp.group.position.z += (mp.targetZ - mp.group.position.z) * Math.min(1.0, dt * 5);
      mp.group.rotation.y += (mp.targetRotY - mp.group.rotation.y) * Math.min(1.0, dt * 5);
    });
  }

  public getOnlinePlayersData(): OnlinePlayer[] {
    return this.multiplayerPlayers.map((mp, i) => ({
      id: mp.id,
      name: mp.name,
      carModel: mp.carModel,
      carName: mp.name,
      color: '#38bdf8',
      x: mp.group.position.x,
      z: mp.group.position.z,
      rotY: mp.group.rotation.y,
      speedKmh: Math.round(mp.speedKmh),
      statusText: mp.statusText,
      pingMs: 24 + i * 11,
    }));
  }
}
