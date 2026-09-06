/**
 * BeeTransform — trasformata 2D affine (TRS + pivot).
 *
 * Non è un offset anni '90 (`world = parent.x + x`). È una matrice
 *   T(pos) · R · S · T(-pivot)
 * composta con il parent: world = parentWorld · local.
 *
 * La world matrix è lazy: si ricalcola solo se dirty, senza allocare
 * oggetti nuovi nel tick.
 */

export const BEE_TRANSFORM_DEFAULTS = Object.freeze({
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivotX: 0,
    pivotY: 0,
    zIndex: 0
});

const MATRIX_EPSILON = 1e-12;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function createMatrix() {
    return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

function multiply(out, parent, local) {
    const a = parent.a * local.a + parent.c * local.b;
    const b = parent.b * local.a + parent.d * local.b;
    const c = parent.a * local.c + parent.c * local.d;
    const d = parent.b * local.c + parent.d * local.d;
    const tx = parent.a * local.tx + parent.c * local.ty + parent.tx;
    const ty = parent.b * local.tx + parent.d * local.ty + parent.ty;
    out.a = a;
    out.b = b;
    out.c = c;
    out.d = d;
    out.tx = tx;
    out.ty = ty;
}

function invert(source, out) {
    const det = source.a * source.d - source.b * source.c;
    if (Math.abs(det) < MATRIX_EPSILON) {
        out.a = 1;
        out.b = 0;
        out.c = 0;
        out.d = 1;
        out.tx = 0;
        out.ty = 0;
        return false;
    }
    const inv = 1 / det;
    const a = source.d * inv;
    const b = -source.b * inv;
    const c = -source.c * inv;
    const d = source.a * inv;
    out.a = a;
    out.b = b;
    out.c = c;
    out.d = d;
    out.tx = -(a * source.tx + c * source.ty);
    out.ty = -(b * source.tx + d * source.ty);
    return true;
}

export class BeeTransform {
    /**
     * @param {Partial<typeof BEE_TRANSFORM_DEFAULTS>} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_TRANSFORM_DEFAULTS, ...options };

        this.#x = cfg.x;
        this.#y = cfg.y;
        this.#rotation = cfg.rotation;
        this.#scaleX = cfg.scaleX;
        this.#scaleY = cfg.scaleY;
        this.#pivotX = cfg.pivotX;
        this.#pivotY = cfg.pivotY;
        this.zIndex = cfg.zIndex;

        this.onDirty = null;
    }

    #x;
    #y;
    #rotation;
    #scaleX;
    #scaleY;
    #pivotX;
    #pivotY;
    #parent = null;
    #children = [];
    #worldDirty = true;
    #trigDirty = true;
    #cos = 1;
    #sin = 0;
    #local = createMatrix();
    #world = createMatrix();
    #inverse = createMatrix();
    #inverseDirty = true;
    #point = { x: 0, y: 0 };
    #aabb = { x: 0, y: 0, width: 0, height: 0 };

    get x() {
        return this.#x;
    }

    set x(value) {
        const next = Number(value) || 0;
        if (next === this.#x) return;
        this.#x = next;
        this.markDirty();
    }

    get y() {
        return this.#y;
    }

    set y(value) {
        const next = Number(value) || 0;
        if (next === this.#y) return;
        this.#y = next;
        this.markDirty();
    }

    get rotation() {
        return this.#rotation;
    }

    set rotation(value) {
        const next = Number(value) || 0;
        if (next === this.#rotation) return;
        this.#rotation = next;
        this.#trigDirty = true;
        this.markDirty();
    }

    get rotationDegrees() {
        return this.#rotation * RAD2DEG;
    }

    set rotationDegrees(value) {
        this.rotation = (Number(value) || 0) * DEG2RAD;
    }

    get scaleX() {
        return this.#scaleX;
    }

    set scaleX(value) {
        const next = Number.isFinite(Number(value)) ? Number(value) : 1;
        if (next === this.#scaleX) return;
        this.#scaleX = next;
        this.markDirty();
    }

    get scaleY() {
        return this.#scaleY;
    }

    set scaleY(value) {
        const next = Number.isFinite(Number(value)) ? Number(value) : 1;
        if (next === this.#scaleY) return;
        this.#scaleY = next;
        this.markDirty();
    }

    setScale(x, y = x) {
        this.scaleX = x;
        this.scaleY = y;
        return this;
    }

    get pivotX() {
        return this.#pivotX;
    }

    set pivotX(value) {
        const next = Number(value) || 0;
        if (next === this.#pivotX) return;
        this.#pivotX = next;
        this.markDirty();
    }

    get pivotY() {
        return this.#pivotY;
    }

    set pivotY(value) {
        const next = Number(value) || 0;
        if (next === this.#pivotY) return;
        this.#pivotY = next;
        this.markDirty();
    }

    setPivot(x, y) {
        this.pivotX = x;
        this.pivotY = y;
        return this;
    }

    setPivotNormalized(nx, ny, width, height) {
        return this.setPivot((Number(nx) || 0) * width, (Number(ny) || 0) * height);
    }

    get parent() {
        return this.#parent;
    }

    get children() {
        return this.#children;
    }

    #hasAncestor(node) {
        let current = this.#parent;
        while (current) {
            if (current === node) return true;
            current = current.#parent;
        }
        return false;
    }

    #detachFromParent() {
        const parent = this.#parent;
        if (!parent) return;
        const siblings = parent.#children;
        const index = siblings.indexOf(this);
        if (index >= 0) siblings.splice(index, 1);
        this.#parent = null;
    }

    setParent(transform) {
        if (transform === this || this.#parent === transform) return this;
        if (transform && transform.#hasAncestor(this)) return this;

        this.#detachFromParent();
        this.#parent = transform || null;
        if (this.#parent) {
            this.#parent.#children.push(this);
        }
        this.markDirty();
        return this;
    }

    markDirty() {
        if (this.#worldDirty) return;
        this.#worldDirty = true;
        this.#inverseDirty = true;
        const kids = this.#children;
        for (let i = 0; i < kids.length; i++) {
            kids[i].markDirty();
        }
        if (typeof this.onDirty === 'function') {
            this.onDirty();
        }
    }

    #syncTrig() {
        if (!this.#trigDirty) return;
        this.#cos = Math.cos(this.#rotation);
        this.#sin = Math.sin(this.#rotation);
        this.#trigDirty = false;
    }

    #writeLocal() {
        this.#syncTrig();
        const a = this.#cos * this.#scaleX;
        const b = this.#sin * this.#scaleX;
        const c = -this.#sin * this.#scaleY;
        const d = this.#cos * this.#scaleY;
        const m = this.#local;
        m.a = a;
        m.b = b;
        m.c = c;
        m.d = d;
        m.tx = this.#x - a * this.#pivotX - c * this.#pivotY;
        m.ty = this.#y - b * this.#pivotX - d * this.#pivotY;
    }

    #syncWorld() {
        if (!this.#worldDirty) return;
        this.#writeLocal();
        const parent = this.#parent;
        if (parent) {
            parent.#syncWorld();
            multiply(this.#world, parent.#world, this.#local);
        } else {
            const src = this.#local;
            const dst = this.#world;
            dst.a = src.a;
            dst.b = src.b;
            dst.c = src.c;
            dst.d = src.d;
            dst.tx = src.tx;
            dst.ty = src.ty;
        }
        this.#worldDirty = false;
        this.#inverseDirty = true;
    }

    get localMatrix() {
        this.#writeLocal();
        return this.#local;
    }

    get worldMatrix() {
        this.#syncWorld();
        return this.#world;
    }

    get worldX() {
        this.#syncWorld();
        return this.#world.tx;
    }

    set worldX(value) {
        this.setWorldOrigin(value, this.worldY);
    }

    get worldY() {
        this.#syncWorld();
        return this.#world.ty;
    }

    set worldY(value) {
        this.setWorldOrigin(this.worldX, value);
    }

    get worldRotation() {
        this.#syncWorld();
        return Math.atan2(this.#world.b, this.#world.a);
    }

    get worldScaleX() {
        this.#syncWorld();
        return Math.hypot(this.#world.a, this.#world.b);
    }

    get worldScaleY() {
        this.#syncWorld();
        return Math.hypot(this.#world.c, this.#world.d);
    }

    /**
     * Posiziona l'origine locale (0,0) in un punto mondo.
     * Inverte la catena parent, non fa `x = world - parent.x`.
     */
    setWorldOrigin(worldX, worldY) {
        let originX = worldX;
        let originY = worldY;
        if (this.#parent) {
            this.#parent.inverseTransformPoint(worldX, worldY, this.#point);
            originX = this.#point.x;
            originY = this.#point.y;
        }
        this.#writeLocal();
        this.x = originX + this.#local.a * this.#pivotX + this.#local.c * this.#pivotY;
        this.y = originY + this.#local.b * this.#pivotX + this.#local.d * this.#pivotY;
        return this;
    }

    transformPoint(localX, localY, out = this.#point) {
        this.#syncWorld();
        const m = this.#world;
        out.x = m.a * localX + m.c * localY + m.tx;
        out.y = m.b * localX + m.d * localY + m.ty;
        return out;
    }

    inverseTransformPoint(worldX, worldY, out = this.#point) {
        this.#syncWorld();
        if (this.#inverseDirty) {
            invert(this.#world, this.#inverse);
            this.#inverseDirty = false;
        }
        const m = this.#inverse;
        out.x = m.a * worldX + m.c * worldY + m.tx;
        out.y = m.b * worldX + m.d * worldY + m.ty;
        return out;
    }

    /**
     * AABB mondo del rettangolo locale (0,0)-(width,height), dopo rotazione/scala.
     */
    getWorldAABB(width, height, out = this.#aabb) {
        const p0 = this.transformPoint(0, 0);
        const x0 = p0.x;
        const y0 = p0.y;
        const p1 = this.transformPoint(width, 0);
        const x1 = p1.x;
        const y1 = p1.y;
        const p2 = this.transformPoint(width, height);
        const x2 = p2.x;
        const y2 = p2.y;
        const p3 = this.transformPoint(0, height);
        const x3 = p3.x;
        const y3 = p3.y;

        const minX = Math.min(x0, x1, x2, x3);
        const minY = Math.min(y0, y1, y2, y3);
        const maxX = Math.max(x0, x1, x2, x3);
        const maxY = Math.max(y0, y1, y2, y3);
        out.x = minX;
        out.y = minY;
        out.width = maxX - minX;
        out.height = maxY - minY;
        return out;
    }

    applyWorldTo(ctx) {
        this.#syncWorld();
        const m = this.#world;
        ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
        return this;
    }

    lookAt(worldX, worldY) {
        const origin = this.transformPoint(this.#pivotX, this.#pivotY);
        this.rotation = Math.atan2(worldY - origin.y, worldX - origin.x);
        return this;
    }
}
