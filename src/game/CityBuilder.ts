import * as THREE from 'three';

export interface CollisionObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  type: 'building' | 'barrier' | 'curb' | 'parked_car' | 'prop';
}

export interface CityBuildResult {
  group: THREE.Group;
  streetLights: THREE.PointLight[];
  obstacles: CollisionObstacle[];
  targetIndicator: THREE.Group;
}

export class CityBuilder {
  public static buildCity(): CityBuildResult {
    const group = new THREE.Group();
    group.name = 'city_environment';

    const streetLights: THREE.PointLight[] = [];
    const obstacles: CollisionObstacle[] = [];

    // 1. Materials
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      roughness: 0.85,
      metalness: 0.1,
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x6e7683,
      roughness: 0.8,
      metalness: 0.05,
    });

    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const parkingLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const buildingMat1 = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7,
    });

    const buildingMat2 = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.5,
    });

    const glassWindowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.9,
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.9,
    });

    // 2. Base Ground (Grass & Surrounding Terrain)
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const ground = new THREE.Mesh(groundGeo, grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    group.add(ground);

    // 3. Roads Network
    // Main North-South Boulevard (Z: -120 to +120, X: -9 to +9)
    const nsRoadGeo = new THREE.PlaneGeometry(18, 260);
    const nsRoad = new THREE.Mesh(nsRoadGeo, asphaltMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.receiveShadow = true;
    group.add(nsRoad);

    // Main East-West Avenue (X: -140 to +140, Z: -9 to +9)
    const ewRoadGeo = new THREE.PlaneGeometry(280, 18);
    const ewRoad = new THREE.Mesh(ewRoadGeo, asphaltMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.receiveShadow = true;
    group.add(ewRoad);

    // Secondary Roads (Parallel streets)
    const parallelRoadEast = new THREE.Mesh(new THREE.PlaneGeometry(14, 200), asphaltMat);
    parallelRoadEast.rotation.x = -Math.PI / 2;
    parallelRoadEast.position.set(65, 0, 0);
    parallelRoadEast.receiveShadow = true;
    group.add(parallelRoadEast);

    const parallelRoadWest = new THREE.Mesh(new THREE.PlaneGeometry(14, 200), asphaltMat);
    parallelRoadWest.rotation.x = -Math.PI / 2;
    parallelRoadWest.position.set(-65, 0, 0);
    parallelRoadWest.receiveShadow = true;
    group.add(parallelRoadWest);

    const parallelRoadNorth = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), asphaltMat);
    parallelRoadNorth.rotation.x = -Math.PI / 2;
    parallelRoadNorth.position.set(0, 0, 65);
    parallelRoadNorth.receiveShadow = true;
    group.add(parallelRoadNorth);

    const parallelRoadSouth = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), asphaltMat);
    parallelRoadSouth.rotation.x = -Math.PI / 2;
    parallelRoadSouth.position.set(0, 0, -65);
    parallelRoadSouth.receiveShadow = true;
    group.add(parallelRoadSouth);

    // 4. Central Parking Plaza (X: 16 to 48, Z: -48 to -16)
    const parkingPlazaGeo = new THREE.PlaneGeometry(36, 36);
    const parkingPlaza = new THREE.Mesh(parkingPlazaGeo, asphaltMat);
    parkingPlaza.rotation.x = -Math.PI / 2;
    parkingPlaza.position.set(34, 0.01, -32);
    parkingPlaza.receiveShadow = true;
    group.add(parkingPlaza);

    // Sidewalk around parking plaza
    this.createSidewalk(group, 34, -32, 40, 40, sidewalkMat, obstacles);

    // Paint Parking Bays in the Plaza
    this.createParkingPlazaBays(group, 34, -32, parkingLineMat);

    // 5. Road Markings (Yellow double lines, white dashes, crosswalks)
    this.createRoadMarkings(group, roadLineMat, yellowLineMat);

    // 6. Modern Gas Station (X: -36, Z: -32)
    this.createGasStation(group, streetLights, obstacles);

    // 7. City Buildings (Downtown Skyscrapers & Commercial Blocks)
    this.createCityBuildings(group, buildingMat1, buildingMat2, glassWindowMat, obstacles);

    // 8. Streetlights with dynamic illumination
    this.createStreetlights(group, streetLights);

    // 9. Street Trees & Props (benches, hydrants, planters)
    this.createStreetProps(group, obstacles);

    // 10. Parked decorative NPC cars in parking bays
    this.createParkedCars(group, obstacles);

    // 11. Target Indicator for active parking mission
    const targetIndicator = this.createTargetIndicator();
    group.add(targetIndicator);

    return {
      group,
      streetLights,
      obstacles,
      targetIndicator,
    };
  }

  private static createSidewalk(
    parent: THREE.Group,
    x: number,
    z: number,
    w: number,
    d: number,
    mat: THREE.Material,
    obstacles: CollisionObstacle[]
  ) {
    const curbHeight = 0.15;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, curbHeight, d), mat);
    mesh.position.set(x, curbHeight / 2, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
  }

  private static createParkingPlazaBays(parent: THREE.Group, centerX: number, centerZ: number, lineMat: THREE.Material) {
    // 2 rows of 6 parking bays
    const bayWidth = 2.8;
    const bayLength = 5.2;
    const lineWidth = 0.12;

    for (let row = 0; row < 2; row++) {
      const zOffset = row === 0 ? -8 : 8;
      for (let col = -3; col <= 3; col++) {
        const xOffset = col * (bayWidth + 0.15);

        // U-shape parking stall line
        const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(lineWidth, bayLength), lineMat);
        leftLine.rotation.x = -Math.PI / 2;
        leftLine.position.set(centerX + xOffset - bayWidth / 2, 0.03, centerZ + zOffset);
        parent.add(leftLine);

        const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(lineWidth, bayLength), lineMat);
        rightLine.rotation.x = -Math.PI / 2;
        rightLine.position.set(centerX + xOffset + bayWidth / 2, 0.03, centerZ + zOffset);
        parent.add(rightLine);

        const backLine = new THREE.Mesh(new THREE.PlaneGeometry(bayWidth, lineWidth), lineMat);
        backLine.rotation.x = -Math.PI / 2;
        const backZ = row === 0 ? centerZ + zOffset - bayLength / 2 : centerZ + zOffset + bayLength / 2;
        backLine.position.set(centerX + xOffset, 0.03, backZ);
        parent.add(backLine);

        // Rubber wheel stop curb
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.1, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        curb.position.set(centerX + xOffset, 0.05, backZ + (row === 0 ? 0.4 : -0.4));
        parent.add(curb);
      }
    }
  }

  private static createRoadMarkings(parent: THREE.Group, whiteMat: THREE.Material, yellowMat: THREE.Material) {
    const markY = 0.02;

    // Center double yellow lines for N-S boulevard
    const doubleLineGeo = new THREE.PlaneGeometry(0.15, 240);
    const leftYellow = new THREE.Mesh(doubleLineGeo, yellowMat);
    leftYellow.rotation.x = -Math.PI / 2;
    leftYellow.position.set(-0.2, markY, 0);
    parent.add(leftYellow);

    const rightYellow = new THREE.Mesh(doubleLineGeo, yellowMat);
    rightYellow.rotation.x = -Math.PI / 2;
    rightYellow.position.set(0.2, markY, 0);
    parent.add(rightYellow);

    // Dashed white lane lines
    for (let z = -110; z <= 110; z += 6) {
      if (Math.abs(z) < 14) continue; // Skip main intersection
      const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3.2), whiteMat);
      dash1.rotation.x = -Math.PI / 2;
      dash1.position.set(-4.5, markY, z);
      parent.add(dash1);

      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3.2), whiteMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(4.5, markY, z);
      parent.add(dash2);
    }

    // E-W Avenue markings
    for (let x = -130; x <= 130; x += 6) {
      if (Math.abs(x) < 14) continue;
      const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.15), whiteMat);
      dash1.rotation.x = -Math.PI / 2;
      dash1.position.set(x, markY, -4.5);
      parent.add(dash1);

      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.15), whiteMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(x, markY, 4.5);
      parent.add(dash2);
    }

    // Crosswalks (Zebra stripes) at main intersection
    const crosswalkGeo = new THREE.PlaneGeometry(0.8, 3.5);
    for (let i = -7; i <= 7; i += 1.6) {
      // North Crosswalk
      const stripeN = new THREE.Mesh(crosswalkGeo, whiteMat);
      stripeN.rotation.x = -Math.PI / 2;
      stripeN.position.set(i, markY, 11);
      parent.add(stripeN);

      // South Crosswalk
      const stripeS = new THREE.Mesh(crosswalkGeo, whiteMat);
      stripeS.rotation.x = -Math.PI / 2;
      stripeS.position.set(i, markY, -11);
      parent.add(stripeS);
    }
  }

  private static createGasStation(parent: THREE.Group, lights: THREE.PointLight[], obstacles: CollisionObstacle[]) {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-36, 0, -28);

    // Station Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    const canopyTrimMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
    });

    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 20), canopyMat);
    canopyRoof.position.set(0, 4.8, 0);
    stationGroup.add(canopyRoof);

    // Glowing red canopy edge
    const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.25, 20.3), canopyTrimMat);
    edgeTrim.position.set(0, 4.8, 0);
    stationGroup.add(edgeTrim);

    // 4 Support Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
    const pillarPositions = [
      [-6, 0, -6],
      [6, 0, -6],
      [-6, 0, 6],
      [6, 0, 6],
    ];

    pillarPositions.forEach(([px, py, pz]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4.8, 12), pillarMat);
      pillar.position.set(px, 2.4, pz);
      stationGroup.add(pillar);

      // Add to obstacles
      obstacles.push({
        minX: -36 + px - 0.3,
        maxX: -36 + px + 0.3,
        minZ: -28 + pz - 0.3,
        maxZ: -28 + pz + 0.3,
        height: 4.8,
        type: 'barrier',
      });
    });

    // 4 Fuel Pumps
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const pumpPositions = [
      [-2.5, 0, -4],
      [2.5, 0, -4],
      [-2.5, 0, 4],
      [2.5, 0, 4],
    ];

    pumpPositions.forEach(([px, py, pz]) => {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 1.4), pumpMat);
      pump.position.set(px, 0.9, pz);
      stationGroup.add(pump);

      obstacles.push({
        minX: -36 + px - 0.5,
        maxX: -36 + px + 0.5,
        minZ: -28 + pz - 0.8,
        maxZ: -28 + pz + 0.8,
        height: 1.8,
        type: 'barrier',
      });
    });

    // Convenience Store Building behind pumps
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const store = new THREE.Mesh(new THREE.BoxGeometry(16, 4.2, 10), storeMat);
    store.position.set(0, 2.1, 16);
    stationGroup.add(store);

    // Neon Shop Sign
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8, 1.0, 0.2), signMat);
    sign.position.set(0, 3.2, 10.9);
    stationGroup.add(sign);

    obstacles.push({
      minX: -36 - 8,
      maxX: -36 + 8,
      minZ: -28 + 11,
      maxZ: -28 + 21,
      height: 4.2,
      type: 'building',
    });

    // Under-canopy bright ceiling lights
    const canopyLight1 = new THREE.PointLight(0xffffff, 4.0, 18, 1.5);
    canopyLight1.position.set(-36, 4.4, -28 - 4);
    parent.add(canopyLight1);
    lights.push(canopyLight1);

    const canopyLight2 = new THREE.PointLight(0xffffff, 4.0, 18, 1.5);
    canopyLight2.position.set(-36, 4.4, -28 + 4);
    parent.add(canopyLight2);
    lights.push(canopyLight2);

    parent.add(stationGroup);
  }

  private static createCityBuildings(
    parent: THREE.Group,
    mat1: THREE.Material,
    mat2: THREE.Material,
    glassMat: THREE.Material,
    obstacles: CollisionObstacle[]
  ) {
    // City block definitions: [x, z, width, depth, height, matIndex]
    const buildingDefs = [
      // Northeast Block
      { x: 32, z: 32, w: 24, d: 24, h: 48, mat: mat1 },
      { x: 70, z: 32, w: 28, d: 22, h: 32, mat: mat2 },
      { x: 32, z: 70, w: 22, d: 30, h: 38, mat: mat2 },
      { x: 72, z: 72, w: 26, d: 26, h: 64, mat: mat1 },

      // Northwest Block
      { x: -34, z: 32, w: 26, d: 22, h: 42, mat: mat2 },
      { x: -70, z: 32, w: 26, d: 24, h: 56, mat: mat1 },
      { x: -34, z: 70, w: 24, d: 28, h: 30, mat: mat1 },
      { x: -72, z: 72, w: 26, d: 28, h: 46, mat: mat2 },

      // Southeast Block (near parking plaza)
      { x: 34, z: -76, w: 28, d: 26, h: 36, mat: mat1 },
      { x: 72, z: -34, w: 26, d: 24, h: 52, mat: mat2 },
      { x: 74, z: -76, w: 24, d: 26, h: 68, mat: mat1 },

      // Southwest Block
      { x: -72, z: -32, w: 26, d: 26, h: 44, mat: mat2 },
      { x: -34, z: -76, w: 26, d: 26, h: 38, mat: mat1 },
      { x: -74, z: -76, w: 24, d: 24, h: 50, mat: mat2 },
    ];

    buildingDefs.forEach((b, idx) => {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.mat);
      bMesh.position.set(b.x, b.h / 2, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      parent.add(bMesh);

      // Add illuminated window grid strips
      const windowRows = Math.floor(b.h / 3.5);
      for (let r = 2; r < windowRows; r += 2) {
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.1, 1.2, b.d + 0.1), glassMat);
        winBand.position.set(b.x, r * 3.5, b.z);
        parent.add(winBand);
      }

      // Rooftop feature for tall skyscrapers
      if (b.h > 45) {
        const towerGeo = new THREE.CylinderGeometry(0.3, 0.8, 8, 8);
        const tower = new THREE.Mesh(towerGeo, mat2);
        tower.position.set(b.x, b.h + 4, b.z);
        parent.add(tower);

        // Red flashing aircraft warning light
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        beacon.position.set(b.x, b.h + 8.2, b.z);
        parent.add(beacon);
      }

      // Add to collision obstacle map
      obstacles.push({
        minX: b.x - b.w / 2 - 0.4,
        maxX: b.x + b.w / 2 + 0.4,
        minZ: b.z - b.d / 2 - 0.4,
        maxZ: b.z + b.d / 2 + 0.4,
        height: b.h,
        type: 'building',
      });
    });
  }

  private static createStreetlights(parent: THREE.Group, lights: THREE.PointLight[]) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.3 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });

    const polePositions: [number, number, number][] = [
      // Along main boulevard
      [-10.5, -90, Math.PI / 2],
      [10.5, -90, -Math.PI / 2],
      [-10.5, -45, Math.PI / 2],
      [10.5, -45, -Math.PI / 2],
      [-10.5, 45, Math.PI / 2],
      [10.5, 45, -Math.PI / 2],
      [-10.5, 90, Math.PI / 2],
      [10.5, 90, -Math.PI / 2],

      // Along East-West Avenue
      [-90, -10.5, 0],
      [-90, 10.5, Math.PI],
      [-45, -10.5, 0],
      [-45, 10.5, Math.PI],
      [45, -10.5, 0],
      [45, 10.5, Math.PI],
      [90, -10.5, 0],
      [90, 10.5, Math.PI],
    ];

    polePositions.forEach(([px, pz, rotY]) => {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(px, 0, pz);
      poleGroup.rotation.y = rotY;

      // Vertical shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8), poleMat);
      shaft.position.y = 3.75;
      poleGroup.add(shaft);

      // Curved arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), poleMat);
      arm.position.set(0, 7.4, 0.9);
      poleGroup.add(arm);

      // Glowing Lamp head
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), lampGlowMat);
      lamp.position.set(0, 7.3, 1.8);
      poleGroup.add(lamp);

      // Warm spot/point light
      const light = new THREE.PointLight(0xfffaed, 2.8, 22, 1.8);
      light.position.set(0, 7.0, 1.8);
      poleGroup.add(light);
      lights.push(light);

      parent.add(poleGroup);
    });
  }

  private static createStreetProps(parent: THREE.Group, obstacles: CollisionObstacle[]) {
    // Trees along sidewalks
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });

    const treeLocations = [
      [-11, -25],
      [-11, -65],
      [-11, 25],
      [-11, 65],
      [11, -25],
      [11, -65],
      [11, 25],
      [11, 65],
      [-25, -11],
      [-65, -11],
      [25, -11],
      [65, -11],
    ];

    treeLocations.forEach(([tx, tz]) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 8), trunkMat);
      trunk.position.y = 1.4;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.8, 8), foliageMat);
      foliage.position.y = 3.6;
      foliage.castShadow = true;
      treeGroup.add(foliage);

      parent.add(treeGroup);

      obstacles.push({
        minX: tx - 0.4,
        maxX: tx + 0.4,
        minZ: tz - 0.4,
        maxZ: tz + 0.4,
        height: 4.0,
        type: 'prop',
      });
    });

    // Traffic light poles at main crossroads (4 corners)
    const trafficCorners = [
      [-10, -10],
      [10, -10],
      [-10, 10],
      [10, 10],
    ];

    trafficCorners.forEach(([cx, cz]) => {
      const gantry = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 6.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937 })
      );
      gantry.position.set(cx, 3.0, cz);
      parent.add(gantry);

      // Light housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1.2, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x111827 })
      );
      housing.position.set(cx, 5.2, cz);
      parent.add(housing);

      // Green active light
      const greenLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      greenLight.position.set(cx + 0.21, 4.8, cz);
      parent.add(greenLight);
    });
  }

  private static createParkedCars(parent: THREE.Group, obstacles: CollisionObstacle[]) {
    // Parked NPC cars in some bays to create challenging parking scenarios
    const parkedDefs = [
      { x: 34 - 2.95 * 2, z: -32 - 8, rotY: 0, color: 0xd97706 }, // Amber Sedan
      { x: 34 + 2.95 * 2, z: -32 - 8, rotY: 0, color: 0x475569 }, // Slate Gray
      { x: 34 - 2.95 * 1, z: -32 + 8, rotY: Math.PI, color: 0xdc2626 }, // Red Coupe
      { x: 34 + 2.95 * 3, z: -32 + 8, rotY: Math.PI, color: 0x0284c7 }, // Blue Hatch
      // Parallel street parked cars
      { x: 18, z: 12, rotY: Math.PI, color: 0x1e293b },
      { x: 18, z: -4, rotY: Math.PI, color: 0xe2e8f0 },
    ];

    parkedDefs.forEach((p) => {
      const carGroup = new THREE.Group();
      carGroup.position.set(p.x, 0, p.z);
      carGroup.rotation.y = p.rotY;

      // Simple body box
      const bodyMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.3, metalness: 0.6 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.4), bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      carGroup.add(body);

      // Cabin
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.2), cabinMat);
      cabin.position.set(0, 1.1, -0.2);
      carGroup.add(cabin);

      parent.add(carGroup);

      obstacles.push({
        minX: p.x - 1.1,
        maxX: p.x + 1.1,
        minZ: p.z - 2.4,
        maxZ: p.z + 2.4,
        height: 1.5,
        type: 'parked_car',
      });
    });
  }

  private static createTargetIndicator(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'target_parking_indicator';

    // Glowing yellow/green parking bay boundary
    const w = 2.8;
    const l = 5.2;

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85 });
    const outlineGeo = new THREE.BoxGeometry(w, 0.08, l);
    const outline = new THREE.Mesh(outlineGeo, lineMat);
    outline.position.y = 0.05;
    group.add(outline);

    // Glowing beam pointing down from sky
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.8, 14, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.35,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 7.0;
    group.add(beam);

    // Floating parking 'P' icon
    const iconGeo = new THREE.TorusGeometry(0.7, 0.12, 12, 24);
    const iconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const pIcon = new THREE.Mesh(iconGeo, iconMat);
    pIcon.position.y = 4.2;
    pIcon.name = 'floating_p_icon';
    group.add(pIcon);

    return group;
  }
}
