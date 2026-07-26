/**
 * BeeEngine 2D — definizioni TypeScript per autocompletamento IDE e consumo npm.
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Tipi condivisi
// ---------------------------------------------------------------------------

/** Rettangolo axis-aligned (AABB) in coordinate mondo o schermo. */
export interface BeeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Voce del manifest risorse (immagini / audio). */
export interface BeeManifestItem {
  type: "image" | "audio";
  name: string;
  src: string;
}

/** Caricamento risorse raggruppato per tipo. */
export interface BeeAssetList {
  images?: Array<{ name: string; src: string }>;
  sounds?: Array<{ name: string; src: string }>;
}

/** Scena registrabile nel {@link BeeSceneManager}. */
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
  entity: BeeEntity;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  constructor(
    entity: BeeEntity,
    offsetX?: number,
    offsetY?: number,
    width?: number | null,
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

  constructor();

  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  loadAssets(assetList: BeeAssetList): Promise<void>;
  loadImage(name: string, src: string): Promise<HTMLImageElement>;
  getImage(name: string): HTMLImageElement | undefined;
  loadSound(name: string, src: string): Promise<HTMLAudioElement>;
  getSound(name: string): HTMLAudioElement | undefined;
  getAsset(name: string): HTMLImageElement | HTMLAudioElement | undefined;
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

  getMousePosition(e: MouseEvent): { x: number; y: number };
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
  rules: Array<
    | { type: "solid"; movers: string; solids: string }
    | { type: "overlap"; a: string; b: string; callback: BeeOverlapCallback }
  >;

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
// BeePlayer, nemici, proiettili, piattaforme
// ---------------------------------------------------------------------------

export declare class BeePlayer extends BeeEntity {
  speed: number;
  baseJumpForce: number;
  jumpForce: number;
  textureKey: string;
  score: number;
  lives: number;
  mode: BeePlayerMode;

  constructor(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    textureKey?: string
  );

  jump(): void;
  potenziaSalto(amount: number): void;
  potenziaSaltoTemporaneo(amount: number, durationMs: number): void;
  addScore(points: number): void;
  takeDamage(amount?: number): boolean;

  update(dt: number, input: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeNemico extends BeeEntity {
  velocita: number;
  textureKey: string | null;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeEnemyShooter extends BeeNemico {
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

  constructor(
    x: number,
    y: number,
    vx?: number,
    vy?: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  update(dt: number): void;
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

export declare class BeeCollectible {
  canvasWidth: number;
  canvasHeight: number;
  textureKey: string;
  width: number;
  height: number;
  x: number;
  y: number;
  velocita: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    textureKey?: string,
    width?: number,
    height?: number
  );

  reset(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, engine: BeeEngine): void;
}

// ---------------------------------------------------------------------------
// UI e testo
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

export interface BeeButtonMouseState {
  x: number;
  y: number;
  down: boolean;
  pressed: boolean;
  released: boolean;
}

export declare class BeeButton extends BeeEntity {
  static mouse: BeeButtonMouseState;

  text: string;
  font: string;
  background: string;
  hoverBackground: string;
  pressedBackground: string;
  color: string;
  onClick: BeeButtonOptions["onClick"];
  hover: boolean;
  down: boolean;

  static listen(canvas: HTMLCanvasElement): void;
  static endFrame(): void;

  constructor(options?: BeeButtonOptions);

  update(dt: number, scene?: unknown): void;
  draw(ctx: CanvasRenderingContext2D): void;
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
    title?: string
  ): void;
}

// ---------------------------------------------------------------------------
// Tilemap, particelle, sprite, griglia
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

// ---------------------------------------------------------------------------
// Timer, save, menu, touch
// ---------------------------------------------------------------------------

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

export interface BeeTouchButtonLayout {
  key: string;
  x: number;
  y: number;
}

export declare class BeeTouchControls {
  canvas: HTMLCanvasElement;
  input: BeeInput;
  btnSize: number;
  margin: number;
  buttons: Record<
    "left" | "right" | "up" | "down" | "action",
    BeeTouchButtonLayout
  >;
  activeTouches: Record<number, string>;

  constructor(canvas: HTMLCanvasElement, input: BeeInput);

  getButtonAt(x: number, y: number): string | null;
  getCanvasCoords(touch: Touch): { x: number; y: number };
  handleTouch(e: TouchEvent): void;
  handleTouchEnd(e: TouchEvent): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

// ---------------------------------------------------------------------------
// BeeEngine (core)
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
  touchControls?: BeeTouchControls;

  /** Callback di update impostati con {@link BeeEngine.start}. */
  update?: BeeGameLoopCallback;
  /** Callback di render impostati con {@link BeeEngine.start}. */
  render?: BeeRenderCallback;

  constructor(canvasId: string, width: number, height: number);

  enableAutoResize(
    baseWidth?: number,
    baseHeight?: number,
    reservedHeight?: number
  ): void;

  setScene(name: string, data?: unknown): void;
  lockOrientation(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  destroy(): void;

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
  isRectVisibleInView(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean;
  drawEntity(ctx: CanvasRenderingContext2D, entity: BeeEntity): void;
  checkCollision(rect1: BeeRect, rect2: BeeRect): boolean;

  loadAsset(
    type: "image" | "audio",
    name: string,
    src: string
  ): Promise<HTMLImageElement | HTMLAudioElement>;

  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  getAsset(name: string): HTMLImageElement | HTMLAudioElement | undefined;

  playSound(audioAsset: HTMLAudioElement): void;
  playMusic(audioAsset: HTMLAudioElement, volume?: number): void;
}
