/**
 * BeeRigidBody — massa, velocità, forma. Non è Transform.
 * La posa vive sul BeeTransform; questo corpo è ciò che il mondo integra.
 */

export const BEE_BODY_TYPE = Object.freeze({
    STATIC: 'static',
    KINEMATIC: 'kinematic',
    DYNAMIC: 'dynamic'
});

export const BEE_SHAPE = Object.freeze({
    BOX: 'box',
    CIRCLE: 'circle',
    CAPSULE: 'capsule'
});

export const BEE_LAYER = Object.freeze({
    DEFAULT: 1,
    PLAYER: 2,
    WORLD: 4,
    TRIGGER: 8,
    PROJECTILE: 16,
    GHOST: 32,
    ALL: 0xffffffff
});

export const BEE_BODY_DEFAULTS = Object.freeze({
    type: BEE_BODY_TYPE.DYNAMIC,
    mass: 1,
    restitution: 0.2,
    friction: 0.35,
    gravityScale: 1,
    linearDamping: 0.04,
    angularDamping: 0.04,
    layer: BEE_LAYER.DEFAULT,
    mask: BEE_LAYER.ALL,
    isTrigger: false,
    fixedRotation: false
});

let nextBodyId = 1;

function asShape(input, fallbackWidth, fallbackHeight) {
    if (input && typeof input === 'object' && input.type) {
        return { ...input };
    }
    return {
        type: BEE_SHAPE.BOX,
        width: fallbackWidth || 32,
        height: fallbackHeight || 32
    };
}

export class BeeRigidBody {
    static box(width, height) {
        return { type: BEE_SHAPE.BOX, width, height };
    }

    static circle(radius) {
        return { type: BEE_SHAPE.CIRCLE, radius };
    }

    /**
     * Capsula centrata sul pivot, asse locale Y.
     * `length` è la distanza tra i centri dei due cappucci.
     */
    static capsule(radius, length) {
        return { type: BEE_SHAPE.CAPSULE, radius, length };
    }

    /**
     * @param {object} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_BODY_DEFAULTS, ...options };
        const entity = options.entity || null;

        this.id = nextBodyId++;
        this.entity = entity;
        this.transform = options.transform || (entity ? entity.transform : null);
        if (!this.transform) {
            throw new Error('BeeRigidBody: serve un transform');
        }

        this.shape = asShape(
            options.shape,
            entity ? entity.width : 32,
            entity ? entity.height : 32
        );

        this.restitution = cfg.restitution;
        this.friction = cfg.friction;
        this.gravityScale = cfg.gravityScale;
        this.linearDamping = cfg.linearDamping;
        this.angularDamping = cfg.angularDamping;
        this.layer = cfg.layer;
        this.mask = cfg.mask;
        this.isTrigger = cfg.isTrigger === true;
        this.fixedRotation = cfg.fixedRotation === true;
        this.enabled = true;
        this.isGrounded = false;

        this.vx = Number(options.vx) || 0;
        this.vy = Number(options.vy) || 0;
        this.omega = Number(options.omega) || 0;

        this.world = null;
        this.#fx = 0;
        this.#fy = 0;
        this.#torque = 0;
        this.#pose = { x: 0, y: 0, rotation: 0 };
        this.#aabb = { x: 0, y: 0, width: 0, height: 0 };
        this.#scratch = { x: 0, y: 0 };

        this.#type = BEE_BODY_TYPE.DYNAMIC;
        this.#mass = 1;
        this.invMass = 1;
        this.invInertia = 0;
        this.type = cfg.type;
        if (cfg.mass != null && this.#type === BEE_BODY_TYPE.DYNAMIC) {
            this.mass = cfg.mass;
        }
    }

    #type;
    #mass;
    #fx;
    #fy;
    #torque;
    #pose;
    #aabb;
    #scratch;

    get type() {
        return this.#type;
    }

    set type(value) {
        const next = value === BEE_BODY_TYPE.STATIC || value === BEE_BODY_TYPE.KINEMATIC
            ? value
            : BEE_BODY_TYPE.DYNAMIC;
        this.#type = next;
        if (next !== BEE_BODY_TYPE.DYNAMIC) {
            this.#mass = 0;
            this.invMass = 0;
            this.invInertia = 0;
            if (next === BEE_BODY_TYPE.STATIC) {
                this.vx = 0;
                this.vy = 0;
                this.omega = 0;
            }
        } else if (this.#mass <= 0) {
            this.mass = 1;
        } else {
            this.#refreshMass();
        }
    }

    get mass() {
        return this.#mass;
    }

    set mass(value) {
        if (this.#type !== BEE_BODY_TYPE.DYNAMIC) {
            this.#mass = 0;
            this.invMass = 0;
            this.invInertia = 0;
            return;
        }
        const m = Number(value);
        if (!Number.isFinite(m) || m <= 0) {
            this.#mass = 0;
            this.invMass = 0;
            this.invInertia = 0;
            return;
        }
        this.#mass = m;
        this.#refreshMass();
    }

    get pose() {
        return this.#pose;
    }

    get aabb() {
        return this.#aabb;
    }

    #refreshMass() {
        this.invMass = this.#mass > 0 ? 1 / this.#mass : 0;
        if (this.fixedRotation || this.invMass === 0) {
            this.invInertia = 0;
            return;
        }
        const inertia = this.#inertia();
        this.invInertia = inertia > 0 ? 1 / inertia : 0;
    }

    #inertia() {
        const m = this.#mass;
        const shape = this.shape;
        if (shape.type === BEE_SHAPE.CIRCLE) {
            const r = Number(shape.radius) || 0;
            return 0.5 * m * r * r;
        }
        if (shape.type === BEE_SHAPE.CAPSULE) {
            const r = Number(shape.radius) || 0;
            const len = Number(shape.length) || 0;
            const h = len + 2 * r;
            const w = 2 * r;
            return (m * (w * w + h * h)) / 12;
        }
        const w = Number(shape.width) || 0;
        const h = Number(shape.height) || 0;
        return (m * (w * w + h * h)) / 12;
    }

    collidesWith(other) {
        if (!other || other === this) return false;
        return (this.layer & other.mask) !== 0 && (other.layer & this.mask) !== 0;
    }

    applyForce(fx, fy) {
        if (this.invMass === 0) return this;
        this.#fx += fx;
        this.#fy += fy;
        return this;
    }

    applyTorque(torque) {
        if (this.invInertia === 0) return this;
        this.#torque += torque;
        return this;
    }

    applyImpulse(ix, iy) {
        if (this.invMass === 0) return this;
        this.vx += ix * this.invMass;
        this.vy += iy * this.invMass;
        return this;
    }

    applyImpulseAt(ix, iy, worldX, worldY) {
        this.applyImpulse(ix, iy);
        if (this.invInertia === 0) return this;
        const pose = this.#pose;
        const rx = worldX - pose.x;
        const ry = worldY - pose.y;
        this.omega += this.invInertia * (rx * iy - ry * ix);
        return this;
    }

    clearForces() {
        this.#fx = 0;
        this.#fy = 0;
        this.#torque = 0;
    }

    readPose() {
        const xf = this.transform;
        const p = xf.transformPoint(xf.pivotX, xf.pivotY, this.#scratch);
        this.#pose.x = p.x;
        this.#pose.y = p.y;
        this.#pose.rotation = xf.worldRotation;
        return this.#pose;
    }

    writePose() {
        const xf = this.transform;
        const parent = xf.parent;
        const pose = this.#pose;
        if (parent) {
            parent.inverseTransformPoint(pose.x, pose.y, this.#scratch);
            xf.x = this.#scratch.x;
            xf.y = this.#scratch.y;
            xf.rotation = pose.rotation - parent.worldRotation;
        } else {
            xf.x = pose.x;
            xf.y = pose.y;
            xf.rotation = pose.rotation;
        }
        return this;
    }

    integrateForces(dt, gravityX, gravityY) {
        if (this.#type !== BEE_BODY_TYPE.DYNAMIC || this.invMass === 0 || dt <= 0) return;
        this.vx += (gravityX * this.gravityScale + this.#fx * this.invMass) * dt;
        this.vy += (gravityY * this.gravityScale + this.#fy * this.invMass) * dt;
        if (this.invInertia !== 0) {
            this.omega += this.#torque * this.invInertia * dt;
        }
        const lin = Math.max(0, 1 - this.linearDamping * dt);
        const ang = Math.max(0, 1 - this.angularDamping * dt);
        this.vx *= lin;
        this.vy *= lin;
        this.omega *= ang;
    }

    integrateVelocity(dt) {
        if (dt <= 0) return;
        if (this.#type === BEE_BODY_TYPE.STATIC) return;
        this.#pose.x += this.vx * dt;
        this.#pose.y += this.vy * dt;
        if (!this.fixedRotation) {
            this.#pose.rotation += this.omega * dt;
        }
    }

    computeAABB() {
        const pose = this.#pose;
        const shape = this.shape;
        const aabb = this.#aabb;
        const rot = pose.rotation;
        const c = Math.cos(rot);
        const s = Math.sin(rot);

        if (shape.type === BEE_SHAPE.CIRCLE) {
            const r = Number(shape.radius) || 0;
            aabb.x = pose.x - r;
            aabb.y = pose.y - r;
            aabb.width = r * 2;
            aabb.height = r * 2;
            return aabb;
        }

        if (shape.type === BEE_SHAPE.CAPSULE) {
            const r = Number(shape.radius) || 0;
            const half = (Number(shape.length) || 0) * 0.5;
            const ax = pose.x - s * half;
            const ay = pose.y + c * half;
            const bx = pose.x + s * half;
            const by = pose.y - c * half;
            const minX = Math.min(ax, bx) - r;
            const minY = Math.min(ay, by) - r;
            aabb.x = minX;
            aabb.y = minY;
            aabb.width = Math.max(ax, bx) + r - minX;
            aabb.height = Math.max(ay, by) + r - minY;
            return aabb;
        }

        const hw = (Number(shape.width) || 0) * 0.5;
        const hh = (Number(shape.height) || 0) * 0.5;
        const ex = Math.abs(c) * hw + Math.abs(s) * hh;
        const ey = Math.abs(s) * hw + Math.abs(c) * hh;
        aabb.x = pose.x - ex;
        aabb.y = pose.y - ey;
        aabb.width = ex * 2;
        aabb.height = ey * 2;
        return aabb;
    }

    getWorldAABB() {
        this.readPose();
        return this.computeAABB();
    }

    drawDebug(ctx, color) {
        const pose = this.readPose();
        const shape = this.shape;
        ctx.save();
        ctx.strokeStyle = color || '#3dff6a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        if (shape.type === BEE_SHAPE.CIRCLE) {
            ctx.arc(pose.x, pose.y, Number(shape.radius) || 0, 0, Math.PI * 2);
            ctx.moveTo(pose.x, pose.y);
            ctx.lineTo(
                pose.x + Math.cos(pose.rotation) * (Number(shape.radius) || 0),
                pose.y + Math.sin(pose.rotation) * (Number(shape.radius) || 0)
            );
        } else if (shape.type === BEE_SHAPE.CAPSULE) {
            const r = Number(shape.radius) || 0;
            const half = (Number(shape.length) || 0) * 0.5;
            const c = Math.cos(pose.rotation);
            const s = Math.sin(pose.rotation);
            const ax = pose.x - s * half;
            const ay = pose.y + c * half;
            const bx = pose.x + s * half;
            const by = pose.y - c * half;
            ctx.arc(ax, ay, r, 0, Math.PI * 2);
            ctx.moveTo(bx + r, by);
            ctx.arc(bx, by, r, 0, Math.PI * 2);
            ctx.moveTo(ax - c * r, ay - s * r);
            ctx.lineTo(bx - c * r, by - s * r);
            ctx.moveTo(ax + c * r, ay + s * r);
            ctx.lineTo(bx + c * r, by + s * r);
        } else {
            const hw = (Number(shape.width) || 0) * 0.5;
            const hh = (Number(shape.height) || 0) * 0.5;
            const c = Math.cos(pose.rotation);
            const s = Math.sin(pose.rotation);
            const corners = [
                [hw, hh],
                [-hw, hh],
                [-hw, -hh],
                [hw, -hh]
            ];
            for (let i = 0; i < 4; i++) {
                const lx = corners[i][0];
                const ly = corners[i][1];
                const x = pose.x + c * lx - s * ly;
                const y = pose.y + s * lx + c * ly;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        }

        ctx.stroke();
        ctx.restore();
        return this;
    }

    destroy() {
        if (this.world) {
            this.world.remove(this);
        }
        if (this.entity && this.entity.body === this) {
            this.entity.body = null;
        }
        this.entity = null;
        this.enabled = false;
    }
}
