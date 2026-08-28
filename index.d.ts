/**
 * BeeEngine 2D — TypeScript definitions for IDE autocompletion and NPM package consumption.
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box (AABB) in world or screen coordinates. */
export interface BeeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Asset manifest item (images / audio / JSON). */
export interface BeeManifestItem {
  type: "image" | "audio" | "json";
  name: string;
  src: string;
}

/** Asset list grouped by type. */
export interface BeeAssetList {
  images?: Array<{ name: string; src: string }>;
  sounds?: Array<{ name: string; src: string }>;
  jsons?: Array<{ name: string; src: string }>;
}

/** Scene registered in {@link BeeSceneManager}. */
export interface BeeScene {
  entities?: BeeEntity[];
  engine?: BeeEngine;
  scene?: BeeScene;
  enter?(data?: unknown): void;
  exit?(): void;
  onEnter?(data?: unknown): void;
  onExit?(): void;
  update?(dt: number, input?: BeeInput): void;
  draw?(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export type BeePlayerMode = "platformer" | "free";

export type BeeGameLoopCallback = (
  dt: number,
  input: BeeInput
) => void;

export type BeeRenderCallback = (
  ctx: CanvasRenderingContext2D
) => void;

export type BeeEventCallback = (data?: unknown) => void;

export type BeeOverlapCallback = (
  a: BeeEntity,
  b: BeeEntity,
  engine: BeeEngine
) => void;

// ---------------------------------------------------------------------------
// BeeRectCollider
// ---------------------------------------------------------------------------

export declare class BeeRectCollider {
  entity: BeeEntity | null;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  constructor(
    entityOrX?: BeeEntity | number,
    offsetYOrY?: number,
    widthOrW?: number | null,
    heightOrH?: number | null,
    height?: number | null
  );

  get x(): number;
  get y(): number;

  intersects(other: BeeRect | BeeRectCollider): boolean;
  containsPoint(px: number, py: number): boolean;
}

// ---------------------------------------------------------------------------
// BeeEntity
// ---------------------------------------------------------------------------

export declare class BeeEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  gravity: number;
  isGrounded: boolean;
  active: boolean;
  visible: boolean;
  destroyed: boolean;
  collider: BeeRectCollider | null;
  children: BeeEntity[];

  constructor(x?: number, y?: number, width?: number, height?: number);

  addRectCollider(
    offsetX?: number,
    offsetY?: number,
    width?: number | null,
    height?: number | null
  ): BeeRectCollider;

  addChild(entity: BeeEntity): BeeEntity;
  removeChild(entity: BeeEntity): void;
  collidesWith(other: BeeEntity | BeeRect): boolean;
  resolvePlatformCollision(platform: BeeEntity | BeePlatform): boolean;

  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// BeeAssetManager
// ---------------------------------------------------------------------------

export declare class BeeAssetManager {
  images: Map<string, HTMLImageElement>;
  sounds: Map<string, HTMLAudioElement>;
  jsons: Map<string, any>;

  constructor();

  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  loadAssets(assetList: BeeAssetList): Promise<void>;
  loadImage(name: string, src: string): Promise<HTMLImageElement>;
  getImage(name: string): HTMLImageElement | undefined;
  loadSound(name: string, src: string): Promise<HTMLAudioElement>;
  getSound(name: string): HTMLAudioElement | undefined;
  loadJSON(name: string, src: string): Promise<any>;
  getJSON(name: string): any;
  getAsset(name: string): HTMLImageElement | HTMLAudioElement | any | undefined;
  playSound(name: string, volume?: number): void;
}

// ---------------------------------------------------------------------------
// BeeInput
// ---------------------------------------------------------------------------

export interface BeeMouseState {
  x: number;
  y: number;
  pressed: boolean;
  wasPressed: boolean;
}

export declare class BeeInput {
  canvas: HTMLCanvasElement;
  keys: Record<string, boolean>;
  pressed: Record<string, boolean>;
  mouse: BeeMouseState;

  constructor(canvas: HTMLCanvasElement);

  getCanvasPosition(clientX: number, clientY: number): { x: number; y: number };
  isPressed(key: string): boolean;
  wasPressed(key: string): boolean;
  setKey(key: string, value: boolean): void;
  endFrame(): void;
}

// ---------------------------------------------------------------------------
// BeeSceneManager
// ---------------------------------------------------------------------------

export declare class BeeSceneManager {
  engine: BeeEngine;
  ctx: CanvasRenderingContext2D;
  scenes: Map<string, BeeScene>;
  currentScene: BeeScene | null;
  currentSceneName: string | null;

  constructor(engine: BeeEngine);

  add(name: string, scene: BeeScene): void;
  change(name: string, data?: unknown): void;
  addEntity(entity: BeeEntity): void;
  update(dt: number, input?: BeeInput): void;
  draw(ctx?: CanvasRenderingContext2D): void;
  getCurrentScene(): BeeScene | null;
  getCurrentSceneName(): string | null;
}

// ---------------------------------------------------------------------------
// BeeCamera
// ---------------------------------------------------------------------------

export interface BeeCameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export declare class BeeCamera {
  x: number;
  y: number;
  w: number;
  h: number;
  bounds: BeeCameraBounds | null;

  constructor(canvasWidth: number, canvasHeight: number);

  setBounds(x: number, y: number, width: number, height: number): void;
  follow(target: BeeEntity | BeeRect, smooth?: number): void;
  apply(ctx: CanvasRenderingContext2D): void;
  getViewBounds(): BeeRect;
  isRectVisible(x: number, y: number, width: number, height: number): boolean;
}

// ---------------------------------------------------------------------------
// BeeCollisionSystem
// ---------------------------------------------------------------------------

export declare class BeeCollisionSystem {
  engine: BeeEngine;
  groups: Map<string, object[]>;

  constructor(engine: BeeEngine);

  clear(): void;
  createGroup(name: string): this;
  setGroup(name: string, entities: object[]): this;
  add(name: string, entity: object): this;
  remove(name: string, entity: object): this;
  solid(moversGroup: string, solidsGroup: string): this;
  overlap(groupA: string, groupB: string, callback: BeeOverlapCallback): this;
  run(): void;
}

// ---------------------------------------------------------------------------
// Gameplay Entities (BeePlayer, BeeEnemy, BeeBullet, BeePlatform, BeeCollectible)
// ---------------------------------------------------------------------------

export declare class BeePlayer extends BeeEntity {
  speed: number;
  baseJumpForce: number;
  jumpForce: number;
  textureKey: string | null;
  score: number;
  lives: number;
  mode: BeePlayerMode;

  constructor(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  jump(): void;
  boostJump(amount: number): void;
  potenziaSalto(amount: number): void;
  boostJumpTemporary(amount: number, durationMs: number): void;
  potenziaSaltoTemporaneo(amount: number, durationMs: number): void;
  addScore(points: number): void;
  takeDamage(amount?: number): boolean;

  update(dt: number, input: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeEnemy extends BeeEntity {
  speed: number;
  textureKey: string | null;
  minX: number | null;
  maxX: number | null;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  setPatrolBounds(minX: number | null, maxX: number | null): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export type BeeNemico = BeeEnemy;

export declare class BeeEnemyShooter extends BeeEnemy {
  shootInterval: number;
  shootTimer: number;
  bulletSpeed: number;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  update(dt: number, input: BeeInput, engine: BeeEngine): void;
  shoot(engine: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeBullet extends BeeEntity {
  textureKey: string | null;
  lifespan: number;
  age: number;

  constructor(
    x: number,
    y: number,
    vx?: number,
    vy?: number,
    width?: number,
    height?: number,
    textureKey?: string | null,
    lifespan?: number
  );

  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeePlatform extends BeeEntity {
  color: string;
  textureKey: string | null;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    color?: string,
    textureKey?: string | null
  );

  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeCollectible extends BeeEntity {
  canvasWidth: number;
  canvasHeight: number;
  textureKey: string | null;
  speed: number;

  constructor(
    canvasWidth?: number,
    canvasHeight?: number,
    textureKey?: string | null,
    width?: number,
    height?: number
  );

  reset(): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

// ---------------------------------------------------------------------------
// UI & Text
// ---------------------------------------------------------------------------

export interface BeeButtonOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  font?: string;
  background?: string;
  hoverBackground?: string;
  pressedBackground?: string;
  color?: string;
  onClick?: (button: BeeButton, scene?: unknown) => void;
}

export declare class BeeButton extends BeeEntity {
  text: string;
  font: string;
  background: string;
  hoverBackground: string;
  pressedBackground: string;
  color: string;
  onClick: BeeButtonOptions["onClick"];
  hover: boolean;
  down: boolean;

  constructor(options?: BeeButtonOptions);

  update(dt: number, scene?: unknown): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface BeeHUDOptions {
  scoreLabel?: string;
  livesLabel?: string;
  livesIcon?: string;
  barHeight?: number;
  titleColor?: string;
  textColor?: string;
}

export declare class BeeText extends BeeEntity {
  text: string;
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;

  constructor(
    text?: string,
    x?: number,
    y?: number,
    font?: string,
    color?: string,
    align?: CanvasTextAlign
  );

  draw(ctx: CanvasRenderingContext2D): void;

  static drawHUD(
    ctx: CanvasRenderingContext2D,
    score?: number,
    lives?: number,
    title?: string,
    options?: BeeHUDOptions
  ): void;
}

// ---------------------------------------------------------------------------
// Tilemap, Particles, Sprite, Grid, Camera, Save, Touch & Controls
// ---------------------------------------------------------------------------

export interface BeeTilemapOptions {
  x?: number;
  y?: number;
  tiles?: number[][];
  tileSize?: number;
  solidTiles?: number[];
  tileset?: CanvasImageSource | null;
  tilesetColumns?: number;
}

export declare class BeeTilemap extends BeeEntity {
  tiles: number[][];
  tileSize: number;
  solidTiles: number[];
  tileset: CanvasImageSource | null;
  tilesetColumns: number;
  rows: number;
  cols: number;

  constructor(options?: BeeTilemapOptions);

  getTile(col: number, row: number): number | null;
  worldToTile(px: number, py: number): { col: number; row: number };
  isSolidTile(col: number, row: number): boolean;
  isSolidAtPixel(px: number, py: number): boolean;
  entityCollides(entity: BeeEntity): boolean;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export interface BeeParticleEmitOptions {
  speedMin?: number;
  speedMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  color?: string;
}

export interface BeeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export declare class BeeParticleSystem extends BeeEntity {
  particles: BeeParticle[];

  constructor(options?: { x?: number; y?: number });

  emit(count?: number, options?: BeeParticleEmitOptions): void;
  update(dt: number, scene?: unknown): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeSprite {
  image: CanvasImageSource;
  frameWidth: number;
  frameHeight: number;
  framesPerRow: number;
  speed: number;
  frame: number;

  constructor(
    image: CanvasImageSource,
    frameWidth: number,
    frameHeight: number,
    framesPerRow: number,
    speed?: number
  );

  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
}

export declare class BeeGrid {
  cols: number;
  rows: number;
  cellSize: number;
  data: number[][];

  constructor(cols: number, rows: number, cellSize: number);

  setCell(c: number, r: number, val: number): void;
  getCell(c: number, r: number): number | null;
  draw(
    ctx: CanvasRenderingContext2D,
    drawFunction: (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      cellValue: number
    ) => void
  ): void;
}

export declare class BeeTimer {
  duration: number;
  callback: (() => void) | null;
  loop: boolean;
  time: number;
  running: boolean;
  finished: boolean;

  constructor(duration: number, callback?: (() => void) | null, loop?: boolean);

  start(): void;
  stop(): void;
  reset(): void;
  update(dt: number): void;
}

export declare class BeeSave {
  static prefix: string;

  static save(key: string, value: unknown): void;
  static load<T = unknown>(key: string, defaultValue?: T | null): T | null;
  static remove(key: string): void;
  static exists(key: string): boolean;
  static clearAll(): void;
}

export declare class BeeMenuScene implements BeeScene {
  engine: BeeEngine | null;

  constructor();

  enter(): void;
  exit(): void;
  update(dt: number, input: BeeInput): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeJoystick {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  radius: number;
  handleRadius: number;
  active: boolean;
  angle: number;
  distance: number;

  constructor(canvas: HTMLCanvasElement, input: BeeInput);

  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
  getDir(): { x: number; y: number };
}

export declare class BeeSpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  frameCount: number;

  constructor(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    options?: { col?: number; row?: number; framesPerRow?: number; frameCount?: number; offsetX?: number; offsetY?: number }
  );

  drawFrame(
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    destX: number,
    destY: number,
    destW: number,
    destH: number
  ): void;
}

export declare class BeeAnimatedSprite {
  sheet: BeeSpriteSheet;
  animations: Record<string, { frames: number[]; fps?: number; loop?: boolean }>;
  currentAnimName: string;
  currentFrameIndex: number;
  timer: number;
  flipX: boolean;

  constructor(
    spriteSheet: BeeSpriteSheet,
    config?: {
      animation?: string;
      animations?: Record<string, { frames: number[]; fps?: number; loop?: boolean }>;
    }
  );

  play(name: string): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, options?: { width?: number; height?: number }): void;
}

export declare class BeeTilemapLoader {
  engine: BeeEngine;
  solidColliders: BeeRectCollider[];
  isLoaded: boolean;

  constructor(engine: BeeEngine);

  preloadAssets(mapJson: any, basePath?: string): Promise<void>;
  load(mapJson: any): void;
  getColliders(): BeeRectCollider[];
  render(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeVirtualDPad {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  size: number;
  eightWay: boolean;
  state: { up: boolean; down: boolean; left: boolean; right: boolean };

  constructor(options: {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    size?: number;
    eightWay?: boolean;
  });

  resetState(): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeTouchButton {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  radius: number;
  label: string;
  isPressed: boolean;

  constructor(options: {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    radius?: number;
    label?: string;
  });

  render(ctx: CanvasRenderingContext2D): void;
}

// ---------------------------------------------------------------------------
// BeeEngine (Core)
// ---------------------------------------------------------------------------

export declare class BeeEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  assets: BeeAssetManager;
  input: BeeInput;
  scenes: BeeSceneManager;
  entities: BeeEntity[];
  collisions: BeeCollisionSystem;
  lastTime: number;
  camera: BeeCamera | null;
  grid: BeeGrid | null;
  currentScene: BeeScene | null;
  events: Record<string, BeeEventCallback[]>;
  isRunning: boolean;
  isPaused: boolean;
  animationFrameId: number | null;
  touchControls?: BeeTouchControls | BeeJoystick;

  update?: BeeGameLoopCallback;
  render?: BeeRenderCallback;

  constructor(canvasId: string | HTMLCanvasElement, width?: number, height?: number);

  enableAutoResize(
    baseWidth?: number,
    baseHeight?: number,
    reservedHeight?: number
  ): void;

  setScene(name: string, data?: unknown): void;
  lockOrientation(orientation?: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;

  enableJoystick(options?: object): BeeJoystick;
  enableTouchControls(): BeeTouchControls;

  createSpriteSheet(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    config?: object
  ): BeeSpriteSheet;

  createAnimatedSprite(
    spriteSheet: BeeSpriteSheet,
    config?: object
  ): BeeAnimatedSprite;

  start(
    updateCallback?: BeeGameLoopCallback,
    renderCallback?: BeeRenderCallback
  ): void;

  loop(timestamp: number): void;

  on(evento: string, callback: BeeEventCallback): void;
  emit(evento: string, dati?: unknown): void;
  off(evento: string, callback: BeeEventCallback): void;

  addEntity(entity: BeeEntity): void;
  updateEntities(dt: number, input: BeeInput): void;
  renderEntities(ctx: CanvasRenderingContext2D): void;
  getEntityDrawBounds(entity: BeeEntity): BeeRect | null;
  isRectVisibleInView(x: number, y: number, width: number, height: number): boolean;
  drawEntity(ctx: CanvasRenderingContext2D, entity: BeeEntity): void;
  checkCollision(rect1: BeeRect, rect2: BeeRect): boolean;

  loadAsset(type: string, name: string, src: string): Promise<any>;
  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  getAsset(name: string): any;
  playSound(audioAsset: HTMLAudioElement): void;
  playMusic(audioAsset: HTMLAudioElement, volume?: number): void;
}
