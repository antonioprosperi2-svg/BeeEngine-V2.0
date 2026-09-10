/**
 * BeePhysicsWorld — gravità di scena, contatti, impulsi.
 * BeeCollisionSystem resta il risolutore AABB a gruppi: questo è il mondo.
 */

import { BeeRigidBody, BEE_BODY_TYPE, BEE_SHAPE } from './BeeRigidBody.js';
import { BeeSpatialHash, BEE_SPATIAL_HASH_DEFAULTS } from './BeeSpatialHash.js';

export const BEE_PHYSICS_DEFAULTS = Object.freeze({
    gravityX: 0,
    gravityY: 980,
    iterations: 8,
    slop: 0.5,
    baumgarte: 0.8,
    maxVelocity: 2400,
    cellSize: BEE_SPATIAL_HASH_DEFAULTS.cellSize
});

function aabbOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function pairKey(a, b) {
    return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
}

function fillContact(out, a, b, nx, ny, depth, px, py) {
    out.a = a;
    out.b = b;
    out.nx = nx;
    out.ny = ny;
    out.depth = depth;
    out.px = px;
    out.py = py;
    return true;
}

function circleCircle(a, b, out) {
    const pa = a.pose;
    const pb = b.pose;
    const ra = Number(a.shape.radius) || 0;
    const rb = Number(b.shape.radius) || 0;
    const dx = pa.x - pb.x;
    const dy = pa.y - pb.y;
    const distSq = dx * dx + dy * dy;
    const radii = ra + rb;
    if (distSq > radii * radii) return false;
    const dist = Math.sqrt(distSq);
    let nx;
    let ny;
    if (dist < 1e-8) {
        nx = 0;
        ny = -1;
    } else {
        nx = dx / dist;
        ny = dy / dist;
    }
    const depth = radii - dist;
    return fillContact(out, a, b, nx, ny, depth, pb.x + nx * rb, pb.y + ny * rb);
}

function closestPointOnObb(px, py, body, out) {
    const pose = body.pose;
    const hw = (Number(body.shape.width) || 0) * 0.5;
    const hh = (Number(body.shape.height) || 0) * 0.5;
    const c = Math.cos(pose.rotation);
    const s = Math.sin(pose.rotation);
    const dx = px - pose.x;
    const dy = py - pose.y;
    const lx = clamp(dx * c + dy * s, -hw, hw);
    const ly = clamp(-dx * s + dy * c, -hh, hh);
    out.x = pose.x + c * lx - s * ly;
    out.y = pose.y + s * lx + c * ly;
    out.inside = Math.abs(dx * c + dy * s) <= hw && Math.abs(-dx * s + dy * c) <= hh;
    out.lx = dx * c + dy * s;
    out.ly = -dx * s + dy * c;
    out.hw = hw;
    out.hh = hh;
    out.c = c;
    out.s = s;
    return out;
}

function circleObb(circle, box, out, swapped) {
    const pose = circle.pose;
    closestPointOnObb(pose.x, pose.y, box, _obbPoint);
    const r = Number(circle.shape.radius) || 0;
    const dx = pose.x - _obbPoint.x;
    const dy = pose.y - _obbPoint.y;
    const distSq = dx * dx + dy * dy;

    if (_obbPoint.inside) {
        const gapX = _obbPoint.hw - Math.abs(_obbPoint.lx);
        const gapY = _obbPoint.hh - Math.abs(_obbPoint.ly);
        let nx;
        let ny;
        let depth;
        if (gapX < gapY) {
            nx = _obbPoint.lx < 0 ? -_obbPoint.c : _obbPoint.c;
            ny = _obbPoint.lx < 0 ? -_obbPoint.s : _obbPoint.s;
            depth = gapX + r;
        } else {
            nx = _obbPoint.ly < 0 ? _obbPoint.s : -_obbPoint.s;
            ny = _obbPoint.ly < 0 ? -_obbPoint.c : _obbPoint.c;
            depth = gapY + r;
        }
        if (swapped) {
            return fillContact(out, box, circle, -nx, -ny, depth, pose.x, pose.y);
        }
        return fillContact(out, circle, box, nx, ny, depth, pose.x - nx * r, pose.y - ny * r);
    }

    if (distSq > r * r) return false;
    const dist = Math.sqrt(distSq);
    const nx = dist < 1e-8 ? 0 : dx / dist;
    const ny = dist < 1e-8 ? -1 : dy / dist;
    const depth = r - dist;
    if (swapped) {
        return fillContact(out, box, circle, -nx, -ny, depth, _obbPoint.x, _obbPoint.y);
    }
    return fillContact(out, circle, box, nx, ny, depth, _obbPoint.x, _obbPoint.y);
}

function projectObb(body, ax, ay) {
    const pose = body.pose;
    const hw = (Number(body.shape.width) || 0) * 0.5;
    const hh = (Number(body.shape.height) || 0) * 0.5;
    const c = Math.cos(pose.rotation);
    const s = Math.sin(pose.rotation);
    const axisX = c;
    const axisY = s;
    const axisYx = -s;
    const axisYy = c;
    const extent = hw * Math.abs(ax * axisX + ay * axisY) + hh * Math.abs(ax * axisYx + ay * axisYy);
    const center = pose.x * ax + pose.y * ay;
    return { min: center - extent, max: center + extent, extent, center };
}

function obbObb(a, b, out) {
    const pa = a.pose;
    const pb = b.pose;
    const ca = Math.cos(pa.rotation);
    const sa = Math.sin(pa.rotation);
    const cb = Math.cos(pb.rotation);
    const sb = Math.sin(pb.rotation);
    const axes = [
        [ca, sa],
        [-sa, ca],
        [cb, sb],
        [-sb, cb]
    ];

    let minDepth = Infinity;
    let nx = 0;
    let ny = 0;

    for (let i = 0; i < 4; i++) {
        const ax = axes[i][0];
        const ay = axes[i][1];
        const projA = projectObb(a, ax, ay);
        const projB = projectObb(b, ax, ay);
        const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
        if (overlap <= 0) return false;
        if (overlap < minDepth) {
            minDepth = overlap;
            const dir = projA.center >= projB.center ? 1 : -1;
            nx = ax * dir;
            ny = ay * dir;
        }
    }

    return fillContact(
        out,
        a,
        b,
        nx,
        ny,
        minDepth,
        (pa.x + pb.x) * 0.5,
        (pa.y + pb.y) * 0.5
    );
}

function capsuleEnds(body, outA, outB) {
    const pose = body.pose;
    const half = (Number(body.shape.length) || 0) * 0.5;
    const c = Math.cos(pose.rotation);
    const s = Math.sin(pose.rotation);
    outA.x = pose.x - s * half;
    outA.y = pose.y + c * half;
    outB.x = pose.x + s * half;
    outB.y = pose.y - c * half;
}

function closestOnSegment(px, py, ax, ay, bx, by, out) {
    const abx = bx - ax;
    const aby = by - ay;
    const abLenSq = abx * abx + aby * aby;
    let t = 0;
    if (abLenSq > 1e-12) {
        t = clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
    }
    out.x = ax + abx * t;
    out.y = ay + aby * t;
    out.t = t;
    return out;
}

const _capA1 = { x: 0, y: 0 };
const _capA2 = { x: 0, y: 0 };
const _capB1 = { x: 0, y: 0 };
const _capB2 = { x: 0, y: 0 };
const _segP = { x: 0, y: 0, t: 0, inside: false, lx: 0, ly: 0, hw: 0, hh: 0, c: 0, s: 0 };
const _segQ = { x: 0, y: 0, t: 0, inside: false, lx: 0, ly: 0, hw: 0, hh: 0, c: 0, s: 0 };
const _obbPoint = { x: 0, y: 0, inside: false, lx: 0, ly: 0, hw: 0, hh: 0, c: 0, s: 0 };

function circleCapsule(circle, capsule, out, swapped) {
    capsuleEnds(capsule, _capA1, _capA2);
    closestOnSegment(circle.pose.x, circle.pose.y, _capA1.x, _capA1.y, _capA2.x, _capA2.y, _segP);
    const r = (Number(circle.shape.radius) || 0) + (Number(capsule.shape.radius) || 0);
    const dx = circle.pose.x - _segP.x;
    const dy = circle.pose.y - _segP.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > r * r) return false;
    const dist = Math.sqrt(distSq);
    const nx = dist < 1e-8 ? 0 : dx / dist;
    const ny = dist < 1e-8 ? -1 : dy / dist;
    const depth = r - dist;
    const px = _segP.x + nx * (Number(capsule.shape.radius) || 0);
    const py = _segP.y + ny * (Number(capsule.shape.radius) || 0);
    if (swapped) {
        return fillContact(out, capsule, circle, -nx, -ny, depth, px, py);
    }
    return fillContact(out, circle, capsule, nx, ny, depth, px, py);
}

function capsuleCapsule(a, b, out) {
    capsuleEnds(a, _capA1, _capA2);
    capsuleEnds(b, _capB1, _capB2);
    closestOnSegment(_capB1.x, _capB1.y, _capA1.x, _capA1.y, _capA2.x, _capA2.y, _segP);
    closestOnSegment(_capA1.x, _capA1.y, _capB1.x, _capB1.y, _capB2.x, _capB2.y, _segQ);
    closestOnSegment(_segQ.x, _segQ.y, _capA1.x, _capA1.y, _capA2.x, _capA2.y, _segP);
    closestOnSegment(_segP.x, _segP.y, _capB1.x, _capB1.y, _capB2.x, _capB2.y, _segQ);

    const r = (Number(a.shape.radius) || 0) + (Number(b.shape.radius) || 0);
    const dx = _segP.x - _segQ.x;
    const dy = _segP.y - _segQ.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > r * r) return false;
    const dist = Math.sqrt(distSq);
    const nx = dist < 1e-8 ? 0 : dx / dist;
    const ny = dist < 1e-8 ? -1 : dy / dist;
    return fillContact(
        out,
        a,
        b,
        nx,
        ny,
        r - dist,
        _segQ.x + nx * (Number(b.shape.radius) || 0),
        _segQ.y + ny * (Number(b.shape.radius) || 0)
    );
}

function capsuleObb(capsule, box, out, swapped) {
    capsuleEnds(capsule, _capA1, _capA2);
    closestPointOnObb(_capA1.x, _capA1.y, box, _segP);
    closestPointOnObb(_capA2.x, _capA2.y, box, _segQ);
    const d1x = _capA1.x - _segP.x;
    const d1y = _capA1.y - _segP.y;
    const d2x = _capA2.x - _segQ.x;
    const d2y = _capA2.y - _segQ.y;
    const useA = d1x * d1x + d1y * d1y <= d2x * d2x + d2y * d2y;
    const capPt = useA ? _capA1 : _capA2;
    const boxPt = useA ? _segP : _segQ;
    const r = Number(capsule.shape.radius) || 0;
    const dx = capPt.x - boxPt.x;
    const dy = capPt.y - boxPt.y;
    const distSq = dx * dx + dy * dy;
    const inside = useA ? _segP.inside : _segQ.inside;

    if (inside) {
        const probe = { x: 0, y: 0, inside: false, lx: 0, ly: 0, hw: 0, hh: 0, c: 0, s: 0 };
        closestPointOnObb(capsule.pose.x, capsule.pose.y, box, probe);
        const gapX = probe.hw - Math.abs(probe.lx);
        const gapY = probe.hh - Math.abs(probe.ly);
        let nx;
        let ny;
        let depth;
        if (gapX < gapY) {
            nx = probe.lx < 0 ? -probe.c : probe.c;
            ny = probe.lx < 0 ? -probe.s : probe.s;
            depth = gapX + r;
        } else {
            nx = probe.ly < 0 ? probe.s : -probe.s;
            ny = probe.ly < 0 ? -probe.c : probe.c;
            depth = gapY + r;
        }
        if (swapped) {
            return fillContact(out, box, capsule, -nx, -ny, depth, capsule.pose.x, capsule.pose.y);
        }
        return fillContact(out, capsule, box, nx, ny, depth, capsule.pose.x, capsule.pose.y);
    }

    closestOnSegment(box.pose.x, box.pose.y, _capA1.x, _capA1.y, _capA2.x, _capA2.y, _segP);
    closestPointOnObb(_segP.x, _segP.y, box, _segQ);
    const ox = _segP.x - _segQ.x;
    const oy = _segP.y - _segQ.y;
    const dist2 = ox * ox + oy * oy;
    if (dist2 > r * r && distSq > r * r) return false;
    const useSeg = dist2 <= distSq;
    const fx = useSeg ? ox : dx;
    const fy = useSeg ? oy : dy;
    const fsq = useSeg ? dist2 : distSq;
    const dist = Math.sqrt(fsq);
    const nx = dist < 1e-8 ? 0 : fx / dist;
    const ny = dist < 1e-8 ? -1 : fy / dist;
    const depth = r - dist;
    if (depth <= 0) return false;
    if (swapped) {
        return fillContact(out, box, capsule, -nx, -ny, depth, _segQ.x, _segQ.y);
    }
    return fillContact(out, capsule, box, nx, ny, depth, _segQ.x, _segQ.y);
}

function collide(a, b, out) {
    const ta = a.shape.type;
    const tb = b.shape.type;
    if (ta === BEE_SHAPE.CIRCLE && tb === BEE_SHAPE.CIRCLE) return circleCircle(a, b, out);
    if (ta === BEE_SHAPE.CIRCLE && tb === BEE_SHAPE.BOX) return circleObb(a, b, out, false);
    if (ta === BEE_SHAPE.BOX && tb === BEE_SHAPE.CIRCLE) return circleObb(b, a, out, true);
    if (ta === BEE_SHAPE.BOX && tb === BEE_SHAPE.BOX) return obbObb(a, b, out);
    if (ta === BEE_SHAPE.CIRCLE && tb === BEE_SHAPE.CAPSULE) return circleCapsule(a, b, out, false);
    if (ta === BEE_SHAPE.CAPSULE && tb === BEE_SHAPE.CIRCLE) return circleCapsule(b, a, out, true);
    if (ta === BEE_SHAPE.CAPSULE && tb === BEE_SHAPE.CAPSULE) return capsuleCapsule(a, b, out);
    if (ta === BEE_SHAPE.CAPSULE && tb === BEE_SHAPE.BOX) return capsuleObb(a, b, out, false);
    if (ta === BEE_SHAPE.BOX && tb === BEE_SHAPE.CAPSULE) return capsuleObb(b, a, out, true);
    return false;
}

export class BeePhysicsWorld {
    /**
     * @param {Partial<typeof BEE_PHYSICS_DEFAULTS>} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_PHYSICS_DEFAULTS, ...options };
        this.gravityX = cfg.gravityX;
        this.gravityY = cfg.gravityY;
        this.iterations = cfg.iterations;
        this.slop = cfg.slop;
        this.baumgarte = cfg.baumgarte;
        this.maxVelocity = cfg.maxVelocity;
        this.onBeginOverlap = null;
        this.onEndOverlap = null;
        this.hash = options.hash instanceof BeeSpatialHash
            ? options.hash
            : new BeeSpatialHash({ cellSize: cfg.cellSize });

        this.#bodies = [];
        this.#contacts = [];
        this.#contactCount = 0;
        this.#overlaps = new Set();
        this.#nextOverlaps = new Set();
    }

    #bodies;
    #contacts;
    #contactCount;
    #overlaps;
    #nextOverlaps;

    get bodies() {
        return this.#bodies;
    }

    get contactCount() {
        return this.#contactCount;
    }

    add(body) {
        if (!body) return null;
        if (body.world && body.world !== this) {
            body.world.remove(body);
        }
        if (this.#bodies.indexOf(body) < 0) {
            this.#bodies.push(body);
        }
        body.world = this;
        return body;
    }

    remove(body) {
        const index = this.#bodies.indexOf(body);
        if (index >= 0) this.#bodies.splice(index, 1);
        if (body && body.world === this) body.world = null;
        return this;
    }

    clear() {
        const list = this.#bodies;
        for (let i = 0; i < list.length; i++) {
            if (list[i].world === this) list[i].world = null;
        }
        list.length = 0;
        this.#contactCount = 0;
        this.#overlaps.clear();
        this.#nextOverlaps.clear();
        this.hash.clear();
        return this;
    }

    createBody(options) {
        return this.add(new BeeRigidBody(options));
    }

    #contact(index) {
        let item = this.#contacts[index];
        if (!item) {
            item = { a: null, b: null, nx: 0, ny: 0, depth: 0, px: 0, py: 0 };
            this.#contacts[index] = item;
        }
        return item;
    }

    #clampVelocity(body) {
        const max = this.maxVelocity;
        const vx = body.vx;
        const vy = body.vy;
        const speed = Math.hypot(vx, vy);
        if (speed > max) {
            const scale = max / speed;
            body.vx = vx * scale;
            body.vy = vy * scale;
        }
    }

    #collectContacts() {
        const list = this.#bodies;
        const hash = this.hash;
        hash.clear();

        for (let i = 0; i < list.length; i++) {
            const body = list[i];
            if (!body.enabled) continue;
            if (body.entity && (body.entity.destroyed || body.entity.active === false)) continue;
            hash.insert(body, body.aabb);
        }

        let count = 0;
        hash.forEachPair((a, b) => {
            if (!a.collidesWith(b)) return;
            if (a.invMass === 0 && b.invMass === 0 && a.type !== BEE_BODY_TYPE.KINEMATIC && b.type !== BEE_BODY_TYPE.KINEMATIC) {
                if (!a.isTrigger && !b.isTrigger) return;
            }
            if (!aabbOverlap(a.aabb, b.aabb)) return;
            const contact = this.#contact(count);
            if (collide(a, b, contact)) {
                count += 1;
            }
        });
        this.#contactCount = count;
    }

    query(aabb, out) {
        return this.hash.query(aabb, out);
    }

    queryPoint(x, y, out) {
        return this.hash.queryPoint(x, y, out);
    }

    queryRadius(x, y, radius, out) {
        return this.hash.queryRadius(x, y, radius, out);
    }

    #resolveContact(contact) {
        const a = contact.a;
        const b = contact.b;
        if (a.isTrigger || b.isTrigger) return;

        const nx = contact.nx;
        const ny = contact.ny;
        const rxA = contact.px - a.pose.x;
        const ryA = contact.py - a.pose.y;
        const rxB = contact.px - b.pose.x;
        const ryB = contact.py - b.pose.y;

        const vaX = a.vx - a.omega * ryA;
        const vaY = a.vy + a.omega * rxA;
        const vbX = b.vx - b.omega * ryB;
        const vbY = b.vy + b.omega * rxB;
        const relX = vaX - vbX;
        const relY = vaY - vbY;
        const vn = relX * nx + relY * ny;
        if (vn > 0) return;

        const raN = rxA * ny - ryA * nx;
        const rbN = rxB * ny - ryB * nx;
        const inv = a.invMass + b.invMass + raN * raN * a.invInertia + rbN * rbN * b.invInertia;
        if (inv <= 0) return;

        const e = Math.min(a.restitution, b.restitution);
        const j = -(1 + e) * vn / inv;
        const jx = j * nx;
        const jy = j * ny;

        a.vx += jx * a.invMass;
        a.vy += jy * a.invMass;
        b.vx -= jx * b.invMass;
        b.vy -= jy * b.invMass;
        a.omega += a.invInertia * (rxA * jy - ryA * jx);
        b.omega -= b.invInertia * (rxB * jy - ryB * jx);

        const tx = relX - vn * nx;
        const ty = relY - vn * ny;
        const tangentLen = Math.hypot(tx, ty);
        if (tangentLen > 1e-6) {
            const tnx = tx / tangentLen;
            const tny = ty / tangentLen;
            const raT = rxA * tny - ryA * tnx;
            const rbT = rxB * tny - ryB * tnx;
            const invT = a.invMass + b.invMass + raT * raT * a.invInertia + rbT * rbT * b.invInertia;
            const mu = Math.sqrt(Math.max(0, a.friction * b.friction));
            let jt = -((relX * tnx + relY * tny) / invT);
            const maxF = Math.abs(j) * mu;
            if (jt > maxF) jt = maxF;
            else if (jt < -maxF) jt = -maxF;
            a.vx += tnx * jt * a.invMass;
            a.vy += tny * jt * a.invMass;
            b.vx -= tnx * jt * b.invMass;
            b.vy -= tny * jt * b.invMass;
            a.omega += a.invInertia * (rxA * tny * jt - ryA * tnx * jt);
            b.omega -= b.invInertia * (rxB * tny * jt - ryB * tnx * jt);
        }
    }

    #correctPositions() {
        const slop = this.slop;
        const percent = this.baumgarte;
        const n = this.#contactCount;
        for (let i = 0; i < n; i++) {
            const contact = this.#contacts[i];
            const a = contact.a;
            const b = contact.b;
            if (a.isTrigger || b.isTrigger) continue;
            const depth = contact.depth - slop;
            if (depth <= 0) continue;
            const inv = a.invMass + b.invMass;
            if (inv <= 0) continue;
            const mag = (depth / inv) * percent;
            const cx = contact.nx * mag;
            const cy = contact.ny * mag;
            if (a.invMass !== 0) {
                a.pose.x += cx * a.invMass;
                a.pose.y += cy * a.invMass;
            } else if (a.type === BEE_BODY_TYPE.KINEMATIC) {
                // il cinematico sposta i dinamici, non se stesso
            }
            if (b.invMass !== 0) {
                b.pose.x -= cx * b.invMass;
                b.pose.y -= cy * b.invMass;
            }
        }
    }

    #emitOverlaps() {
        const next = this.#nextOverlaps;
        next.clear();
        const n = this.#contactCount;
        for (let i = 0; i < n; i++) {
            const contact = this.#contacts[i];
            if (!contact.a.isTrigger && !contact.b.isTrigger) continue;
            next.add(pairKey(contact.a, contact.b));
        }

        if (typeof this.onBeginOverlap === 'function') {
            for (const key of next) {
                if (!this.#overlaps.has(key)) {
                    const [idA, idB] = key.split(':');
                    const a = this.#bodyById(Number(idA));
                    const b = this.#bodyById(Number(idB));
                    if (a && b) this.onBeginOverlap(a, b);
                }
            }
        }
        if (typeof this.onEndOverlap === 'function') {
            for (const key of this.#overlaps) {
                if (!next.has(key)) {
                    const [idA, idB] = key.split(':');
                    const a = this.#bodyById(Number(idA));
                    const b = this.#bodyById(Number(idB));
                    if (a && b) this.onEndOverlap(a, b);
                }
            }
        }

        this.#overlaps.clear();
        for (const key of next) this.#overlaps.add(key);
    }

    #bodyById(id) {
        const list = this.#bodies;
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    #refreshGrounded() {
        const list = this.#bodies;
        for (let i = 0; i < list.length; i++) list[i].isGrounded = false;
        const n = this.#contactCount;
        for (let i = 0; i < n; i++) {
            const contact = this.#contacts[i];
            if (contact.a.isTrigger || contact.b.isTrigger) continue;
            if (contact.ny < -0.5 && contact.a.invMass !== 0) contact.a.isGrounded = true;
            if (contact.ny > 0.5 && contact.b.invMass !== 0) contact.b.isGrounded = true;
        }
    }

    step(dt) {
        if (!(dt > 0)) return this;

        const list = this.#bodies;
        for (let i = list.length - 1; i >= 0; i--) {
            const body = list[i];
            const entity = body.entity;
            if (entity && entity.destroyed) {
                this.remove(body);
            }
        }

        for (let i = 0; i < list.length; i++) {
            const body = list[i];
            if (!body.enabled) continue;
            body.readPose();
            body.integrateForces(dt, this.gravityX, this.gravityY);
            this.#clampVelocity(body);
            body.integrateVelocity(dt);
            body.computeAABB();
        }

        this.#collectContacts();

        const iterations = this.iterations;
        for (let k = 0; k < iterations; k++) {
            for (let i = 0; i < this.#contactCount; i++) {
                this.#resolveContact(this.#contacts[i]);
            }
        }

        this.#correctPositions();
        this.#refreshGrounded();
        this.#emitOverlaps();

        for (let i = 0; i < list.length; i++) {
            const body = list[i];
            if (!body.enabled) continue;
            body.writePose();
            body.clearForces();
            if (body.entity) {
                body.entity.isGrounded = body.isGrounded;
                body.entity.vx = body.vx;
                body.entity.vy = body.vy;
            }
        }

        return this;
    }
}

export { BeeRigidBody };
